// src/backend/services/schemaService.js
/**
 * Schema Service - Handles normalized data structure
 * 
 * Collections:
 * - users: User profiles
 * - addresses: Reusable shipping addresses
 * - orders: Order metadata with snapshots
 * - order_items: Individual line items (enables analytics)
 * - payments: Payment transaction details
 */

const admin = require('firebase-admin');
const logger = require('../logger');

class SchemaService {
  constructor(adminDb) {
    this.db = adminDb;
    this.COLLECTIONS = {
      USERS: 'users',
      ADDRESSES: 'addresses',
      ORDERS: 'orders',
      ORDER_ITEMS: 'order_items',
      PAYMENTS: 'payments',
    };
  }

  /**
   * Create or update user profile
   */
  async upsertUser(userId, userData) {
    try {
      const userRef = this.db.collection(this.COLLECTIONS.USERS).doc(userId);
      const snapshot = await userRef.get();
      
      const updateData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!snapshot.exists) {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.metadata = {
          totalOrders: 0,
          totalSpent: 0,
          lastOrderAt: null,
        };
      }

      await userRef.set(updateData, { merge: true });
      logger.info('User profile updated', { userId });
      
      return { success: true, userId };
    } catch (error) {
      logger.error('Error upserting user', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Save reusable address
   */
  async saveAddress(userId, addressData) {
    try {
      const addressId = addressData.addressId || this.generateId();
      const addressRef = this.db.collection(this.COLLECTIONS.ADDRESSES).doc(addressId);

      const data = {
        addressId,
        userId,
        ...addressData,
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const snapshot = await addressRef.get();
      if (!snapshot.exists) {
        data.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await addressRef.set(data, { merge: true });
      logger.info('Address saved', { addressId, userId });

      return { success: true, addressId };
    } catch (error) {
      logger.error('Error saving address', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user's saved addresses
   */
  async getUserAddresses(userId) {
    try {
      const snapshot = await this.db
        .collection(this.COLLECTIONS.ADDRESSES)
        .where('userId', '==', userId)
        .orderBy('isDefault', 'desc')
        .orderBy('lastUsedAt', 'desc')
        .get();

      const addresses = [];
      snapshot.forEach(doc => {
        addresses.push({ id: doc.id, ...doc.data() });
      });

      return addresses;
    } catch (error) {
      logger.error('Error fetching addresses', { userId, error: error.message });
      return [];
    }
  }

  /**
   * Create complete order with normalized structure
   */
  async createOrder(orderData) {
    const orderId = orderData.orderId || this.generateId();
    const batch = this.db.batch();

    try {
      // 1. Create order document
      const orderRef = this.db.collection(this.COLLECTIONS.ORDERS).doc(orderId);
      const order = {
        orderId,
        userId: orderData.userId,
        status: orderData.status || 'pending',
        totalAmount: orderData.totalAmount,
        currency: orderData.currency || 'INR',
        itemCount: orderData.items?.length || 0,
        
        // Address snapshots (immutable)
        shippingAddressSnapshot: orderData.shippingAddress,
        recipientAddressSnapshot: orderData.recipientAddress || null,
        
        // References
        paymentId: null, // Set when payment completes
        
        // Metadata
        orderType: orderData.orderType || 'standard',
        source: orderData.source || 'web',
        notes: orderData.notes || '',
        
        // Provider session info
        providerSessionId: orderData.providerSessionId || null,
        checkoutUrl: orderData.checkoutUrl || null,
        idempotencyKey: orderData.idempotencyKey || null,
        
        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(orderRef, order);

      // 2. Create order items
      if (orderData.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          const itemId = this.generateId();
          const itemRef = this.db.collection(this.COLLECTIONS.ORDER_ITEMS).doc(itemId);
          
          const orderItem = {
            orderItemId: itemId,
            orderId,
            cookieId: item.cookieId || item.id,
            cookieName: item.name || item.cookieName,
            quantity: item.quantity,
            unitPrice: item.price || item.unitPrice,
            subtotal: (item.quantity * (item.price || item.unitPrice)),
            
            // Product snapshot
            productSnapshot: {
              name: item.name || item.cookieName,
              description: item.description || '',
              imageUrl: item.image || item.imageUrl || '',
              sku: item.sku || item.cookieId || item.id,
            },
            
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          
          batch.set(itemRef, orderItem);
        }
      }

      // 3. Update user metadata
      const userRef = this.db.collection(this.COLLECTIONS.USERS).doc(orderData.userId);
      batch.set(userRef, {
        'metadata.lastOrderAt': admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      logger.info('Order created with normalized schema', { orderId, itemCount: orderData.items?.length });

      return { success: true, orderId };
    } catch (error) {
      logger.error('Error creating order', { orderId, error: error.message });
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    try {
      const orderRef = this.db.collection(this.COLLECTIONS.ORDERS).doc(orderId);
      
      const updateData = {
        status,
        ...additionalData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (status === 'completed') {
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await orderRef.update(updateData);
      logger.info('Order status updated', { orderId, status });

      return { success: true };
    } catch (error) {
      logger.error('Error updating order status', { orderId, error: error.message });
      throw error;
    }
  }

  /**
   * Create payment record
   */
  async createPayment(paymentData) {
    const paymentId = paymentData.paymentId || this.generateId();

    try {
      const paymentRef = this.db.collection(this.COLLECTIONS.PAYMENTS).doc(paymentId);
      
      const payment = {
        paymentId,
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        
        // Provider details
        provider: paymentData.provider || 'stripe',
        providerTransactionId: paymentData.providerTransactionId,
        providerSessionId: paymentData.providerSessionId,
        
        // Payment status
        status: paymentData.status || 'pending',
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        
        // Payment method (safe details only)
        paymentMethod: {
          type: paymentData.paymentMethod?.type || 'card',
          cardBrand: paymentData.paymentMethod?.cardBrand || null,
          cardLast4: paymentData.paymentMethod?.cardLast4 || null,
          cardCountry: paymentData.paymentMethod?.cardCountry || null,
          cardExpMonth: paymentData.paymentMethod?.cardExpMonth || null,
          cardExpYear: paymentData.paymentMethod?.cardExpYear || null,
          cardFunding: paymentData.paymentMethod?.cardFunding || null,
        },
        
        // Billing snapshot
        billingSnapshot: paymentData.billingDetails || {},
        
        // Transaction details
        receiptUrl: paymentData.receiptUrl || null,
        chargeId: paymentData.chargeId || null,
        refundId: null,
        
        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (paymentData.status === 'succeeded') {
        payment.capturedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await paymentRef.set(payment);
      logger.info('Payment record created', { paymentId, orderId: paymentData.orderId });

      // Link payment to order
      await this.db.collection(this.COLLECTIONS.ORDERS).doc(paymentData.orderId).update({
        paymentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, paymentId };
    } catch (error) {
      logger.error('Error creating payment', { paymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Get order with items and payment
   */
  async getOrderDetails(orderId) {
    try {
      // Get order
      const orderDoc = await this.db.collection(this.COLLECTIONS.ORDERS).doc(orderId).get();
      if (!orderDoc.exists) {
        return null;
      }

      const order = { id: orderDoc.id, ...orderDoc.data() };

      // Get order items
      const itemsSnapshot = await this.db
        .collection(this.COLLECTIONS.ORDER_ITEMS)
        .where('orderId', '==', orderId)
        .get();

      order.items = [];
      itemsSnapshot.forEach(doc => {
        order.items.push({ id: doc.id, ...doc.data() });
      });

      // Get payment if exists
      if (order.paymentId) {
        const paymentDoc = await this.db
          .collection(this.COLLECTIONS.PAYMENTS)
          .doc(order.paymentId)
          .get();
        
        if (paymentDoc.exists) {
          order.payment = { id: paymentDoc.id, ...paymentDoc.data() };
        }
      }

      return order;
    } catch (error) {
      logger.error('Error fetching order details', { orderId, error: error.message });
      return null;
    }
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(userId, options = {}) {
    try {
      const limit = options.limit || 20;
      const status = options.status || null;

      let query = this.db
        .collection(this.COLLECTIONS.ORDERS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const orders = [];

      for (const doc of snapshot.docs) {
        const order = { id: doc.id, ...doc.data() };
        
        // Optionally fetch items
        if (options.includeItems) {
          const itemsSnapshot = await this.db
            .collection(this.COLLECTIONS.ORDER_ITEMS)
            .where('orderId', '==', doc.id)
            .get();
          
          order.items = [];
          itemsSnapshot.forEach(itemDoc => {
            order.items.push({ id: itemDoc.id, ...itemDoc.data() });
          });
        }

        orders.push(order);
      }

      return orders;
    } catch (error) {
      logger.error('Error fetching user orders', { userId, error: error.message });
      return [];
    }
  }

  /**
   * Analytics: Get popular products
   */
  async getPopularProducts(daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const snapshot = await this.db
        .collection(this.COLLECTIONS.ORDER_ITEMS)
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(startDate))
        .get();

      const productCounts = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const cookieId = data.cookieId;
        
        if (!productCounts[cookieId]) {
          productCounts[cookieId] = {
            cookieId,
            cookieName: data.cookieName,
            totalQuantity: 0,
            orderCount: 0,
          };
        }
        
        productCounts[cookieId].totalQuantity += data.quantity;
        productCounts[cookieId].orderCount += 1;
      });

      const sorted = Object.values(productCounts).sort((a, b) => b.totalQuantity - a.totalQuantity);
      
      return sorted;
    } catch (error) {
      logger.error('Error fetching popular products', { error: error.message });
      return [];
    }
  }

  /**
   * Helper: Generate unique ID
   */
  generateId() {
    return this.db.collection('_temp').doc().id;
  }
}

module.exports = SchemaService;
