const express = require('express');
const logger = require('../logger');

function createOrderRoutes({ adminDb, paymentService, stripeInstance }) {
  const router = express.Router();
  const ORDERS_COLLECTION = 'orders_v2';

  router.get('/order-status', async (req, res) => {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'orderId query parameter is required' 
      });
    }

    if (!adminDb) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database not configured' 
      });
    }

    try {
      const ordersRef = adminDb.collection(ORDERS_COLLECTION);
      const doc = await ordersRef.doc(orderId).get();

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false, 
          error: 'Order not found' 
        });
      }

      const order = doc.data();
      
      if (order.status === 'pending' && stripeInstance) {
        logger.info('Attempting order reconciliation', { orderId });
        
        const reconResult = await paymentService.reconcileWithProvider(
          orderId, 
          stripeInstance
        );

        if (reconResult.success) {
          const updatedDoc = await ordersRef.doc(orderId).get();
          const updatedOrder = updatedDoc.data();
          
          return res.status(200).json({
            success: true,
            order: {
              orderId,
              status: updatedOrder.status,
              totalAmount: updatedOrder.totalAmount,
              paidAt: updatedOrder.paidAt,
              createdAt: updatedOrder.createdAt,
              reconciled: true
            }
          });
        }
      }

      res.status(200).json({
        success: true,
        order: {
          orderId,
          status: order.status,
          totalAmount: order.totalAmount,
          paidAt: order.paidAt,
          createdAt: order.createdAt,
          reconciled: false
        }
      });
    } catch (error) {
      logger.error('Error fetching order status', { 
        orderId, 
        error: error.message 
      });
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch order status' 
      });
    }
  });

  // GET /api/user-orders - Fetch all orders for authenticated user (Google users only)
  router.get('/user-orders', async (req, res) => {
    // This endpoint requires authentication (user attached by requireAuth middleware)
    if (!req.user || !req.user.email) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        orders: []
      });
    }

    if (!adminDb) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured',
        orders: []
      });
    }

    const userEmail = req.user.email.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    try {
      const ordersRef = adminDb.collection(ORDERS_COLLECTION);
      const snapshot = await ordersRef
        .where('userEmail', '==', userEmail)
        .where('status', '==', 'paid')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          orderId: doc.id,
          totalAmount: data.totalAmount || 0,
          itemCount: data.items?.length || data.itemCount || 0,
          items: (data.items || []).map(item => ({
            id: item.id || item.productId,
            name: item.name,
            price: item.price || 0,
            qty: item.qty || item.quantity || 1,
            image: item.image || ''
          })),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          status: data.status || 'paid'
        });
      });

      logger.info('Fetched user orders from Firestore', { 
        email: userEmail, 
        count: orders.length 
      });

      res.status(200).json({
        success: true,
        orders,
        source: 'firestore'
      });
    } catch (error) {
      logger.error('Error fetching user orders', {
        email: userEmail,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        orders: []
      });
    }
  });

  return router;
}

module.exports = createOrderRoutes;
