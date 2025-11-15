const logger = require('../logger');

class PaymentService {
  constructor(adminDb) {
    this.adminDb = adminDb;
    this.ORDERS_COLLECTION = 'orders_v2';
  }

  async finalizeOrder(localOrderId, providerData) {
    try {
      if (!this.adminDb) {
        throw new Error('Firestore not initialized');
      }

      const ordersRef = this.adminDb.collection(this.ORDERS_COLLECTION);
      const docRef = ordersRef.doc(localOrderId);
      const doc = await docRef.get();

      if (!doc.exists) {
        logger.error('Order not found for finalization', { localOrderId });
        return { success: false, error: 'Order not found' };
      }

      const order = doc.data();
      
      const orderAmount = Math.round(Number(order.totalAmount) * 100);
      const providerAmount = providerData.amount_total || providerData.amount || 0;
      
      if (orderAmount !== providerAmount) {
        logger.error('Amount mismatch during reconciliation', {
          localOrderId,
          orderAmount,
          providerAmount,
          difference: Math.abs(orderAmount - providerAmount)
        });
        
        await docRef.set({
          status: 'failed_reconcile',
          reconciliationError: {
            message: 'Amount mismatch',
            orderAmount,
            providerAmount,
            timestamp: new Date().toISOString()
          },
          updatedAt: new Date()
        }, { merge: true });

        return { 
          success: false, 
          error: 'Amount mismatch',
          details: { orderAmount, providerAmount }
        };
      }

      const updateData = {
        status: 'completed',
        paidAt: new Date(),
        providerInfo: {
          id: providerData.id,
          payment_status: providerData.payment_status,
          status: providerData.status,
          provider: providerData.provider || 'stripe'
        },
        paymentIntentId: providerData.payment_intent || null,
        updatedAt: new Date()
      };

      await docRef.set(updateData, { merge: true });

      logger.info('Order finalized successfully', { 
        localOrderId, 
        provider: providerData.provider,
        amount: providerAmount 
      });

      this.emitOrderCompletedEvent(localOrderId, { ...order, ...updateData });

      return { success: true, order: { ...order, ...updateData } };
    } catch (error) {
      logger.error('Error finalizing order', { localOrderId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async reconcileWithProvider(localOrderId, stripeInstance) {
    try {
      if (!this.adminDb) {
        throw new Error('Firestore not initialized');
      }

      const ordersRef = this.adminDb.collection(this.ORDERS_COLLECTION);
      const docRef = ordersRef.doc(localOrderId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return { success: false, error: 'Order not found' };
      }

      const order = doc.data();
      const sessionId = order.providerSessionId;

      if (!sessionId) {
        return { success: false, error: 'No provider session ID' };
      }

      const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
      
      logger.info('Reconciliation query completed', { 
        localOrderId, 
        sessionStatus: session.status,
        paymentStatus: session.payment_status 
      });

      if (session.payment_status === 'paid' && order.status !== 'completed') {
        await this.finalizeOrder(localOrderId, {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
          payment_intent: session.payment_intent,
          provider: 'stripe'
        });
      }

      return { 
        success: true, 
        status: session.payment_status,
        data: session 
      };
    } catch (error) {
      logger.error('Error reconciling with provider', { localOrderId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  emitOrderCompletedEvent(localOrderId, orderData) {
    logger.info('Order completed event emitted', { 
      localOrderId, 
      customerEmail: orderData.userEmail 
    });
  }
}

module.exports = PaymentService;
