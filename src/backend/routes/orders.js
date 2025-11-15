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

  return router;
}

module.exports = createOrderRoutes;
