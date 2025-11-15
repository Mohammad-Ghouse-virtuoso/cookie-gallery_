const PaymentService = require('../../services/paymentService');

describe('PaymentService', () => {
  let paymentService, mockAdminDb;

  beforeEach(() => {
    const mockDocRef = {
      get: jest.fn(),
      set: jest.fn()
    };
    
    const mockCollection = {
      doc: jest.fn(() => mockDocRef)
    };
    
    mockAdminDb = {
      collection: jest.fn(() => mockCollection)
    };

    paymentService = new PaymentService(mockAdminDb);
  });

  describe('finalizeOrder', () => {
    test('should successfully finalize order with matching amounts', async () => {
      const localOrderId = 'order_123';
      const mockOrder = {
        totalAmount: 1000.00,
        status: 'pending',
        userEmail: 'test@example.com'
      };

      const providerData = {
        id: 'cs_test123',
        payment_status: 'paid',
        status: 'complete',
        amount_total: 100000,
        payment_intent: 'pi_test123',
        provider: 'stripe'
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrder
      };

      mockAdminDb.collection().doc().get.mockResolvedValue(mockDoc);
      mockAdminDb.collection().doc().set.mockResolvedValue({});

      const result = await paymentService.finalizeOrder(localOrderId, providerData);

      expect(result.success).toBe(true);
      expect(result.order.status).toBe('completed');
    });

    test('should fail when amounts do not match', async () => {
      const mockOrder = {
        totalAmount: 1000.00,
        status: 'pending'
      };

      const providerData = {
        id: 'cs_test123',
        amount_total: 150000,
        provider: 'stripe'
      };

      const mockDoc = {
        exists: true,
        data: () => mockOrder
      };

      mockAdminDb.collection().doc().get.mockResolvedValue(mockDoc);
      mockAdminDb.collection().doc().set.mockResolvedValue({});

      const result = await paymentService.finalizeOrder('order_123', providerData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount mismatch');
    });
  });
});
