const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Webhook Payload Schema Validation Tests
 * 
 * These tests validate webhook payload structures to ensure our webhook
 * handlers can correctly process incoming events from Stripe.
 */

describe('Webhook Payload Schema Tests', () => {
  let ajv;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  describe('Stripe Webhook Request Schema', () => {
    const webhookRequestSchema = {
      type: 'object',
      required: ['headers', 'rawBody'],
      properties: {
        headers: {
          type: 'object',
          required: ['stripe-signature'],
          properties: {
            'stripe-signature': { type: 'string', minLength: 1 }
          }
        },
        rawBody: { type: 'object' }
      }
    };

    test('validates webhook request with signature', () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 't=1700000000,v1=abc123def456,v0=xyz789'
        },
        rawBody: Buffer.from(JSON.stringify({
          id: 'evt_test_123',
          type: 'checkout.session.completed'
        }))
      };

      const validate = ajv.compile(webhookRequestSchema);
      const isValid = validate(mockRequest);

      expect(isValid).toBe(true);
    });

    test('rejects webhook request without signature', () => {
      const invalidRequest = {
        headers: {},
        rawBody: Buffer.from('{}')
      };

      const validate = ajv.compile(webhookRequestSchema);
      const isValid = validate(invalidRequest);

      expect(isValid).toBe(false);
    });

    test('rejects webhook request with empty signature', () => {
      const invalidRequest = {
        headers: {
          'stripe-signature': ''
        },
        rawBody: Buffer.from('{}')
      };

      const validate = ajv.compile(webhookRequestSchema);
      const isValid = validate(invalidRequest);

      expect(isValid).toBe(false);
    });
  });

  describe('Checkout Session Completed Payload', () => {
    const checkoutSessionCompletedSchema = {
      type: 'object',
      required: ['id', 'object', 'type', 'data'],
      properties: {
        id: { type: 'string', pattern: '^evt_' },
        object: { type: 'string', enum: ['event'] },
        type: { type: 'string', enum: ['checkout.session.completed'] },
        data: {
          type: 'object',
          required: ['object'],
          properties: {
            object: {
              type: 'object',
              required: ['id', 'amount_total', 'currency', 'payment_status', 'metadata'],
              properties: {
                id: { type: 'string', pattern: '^cs_' },
                amount_total: { type: 'number', minimum: 0 },
                currency: { type: 'string' },
                payment_status: { type: 'string', enum: ['paid', 'unpaid', 'no_payment_required'] },
                payment_intent: { type: ['string', 'null'] },
                metadata: {
                  type: 'object',
                  required: ['localOrderId'],
                  properties: {
                    localOrderId: { type: 'string', minLength: 1 }
                  }
                }
              }
            }
          }
        }
      }
    };

    test('validates complete checkout.session.completed payload', () => {
      const mockPayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
            amount_total: 100000,
            currency: 'inr',
            payment_status: 'paid',
            payment_intent: 'pi_test_789',
            metadata: {
              localOrderId: 'order_123'
            }
          }
        }
      };

      const validate = ajv.compile(checkoutSessionCompletedSchema);
      const isValid = validate(mockPayload);

      expect(isValid).toBe(true);
    });

    test('rejects payload without localOrderId in metadata', () => {
      const invalidPayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
            amount_total: 100000,
            currency: 'inr',
            payment_status: 'paid',
            metadata: {}
          }
        }
      };

      const validate = ajv.compile(checkoutSessionCompletedSchema);
      const isValid = validate(invalidPayload);

      expect(isValid).toBe(false);
    });

    test('rejects payload with invalid payment_status', () => {
      const invalidPayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
            amount_total: 100000,
            currency: 'inr',
            payment_status: 'invalid_status',
            metadata: {
              localOrderId: 'order_123'
            }
          }
        }
      };

      const validate = ajv.compile(checkoutSessionCompletedSchema);
      const isValid = validate(invalidPayload);

      expect(isValid).toBe(false);
    });
  });

  describe('Payment Intent Succeeded Payload', () => {
    const paymentIntentSucceededSchema = {
      type: 'object',
      required: ['id', 'object', 'type', 'data'],
      properties: {
        id: { type: 'string', pattern: '^evt_' },
        object: { type: 'string', enum: ['event'] },
        type: { type: 'string', enum: ['payment_intent.succeeded'] },
        data: {
          type: 'object',
          required: ['object'],
          properties: {
            object: {
              type: 'object',
              required: ['id', 'amount', 'currency', 'status'],
              properties: {
                id: { type: 'string', pattern: '^pi_' },
                amount: { type: 'number', minimum: 0 },
                currency: { type: 'string' },
                status: { type: 'string', enum: ['succeeded'] },
                metadata: { type: 'object' }
              }
            }
          }
        }
      }
    };

    test('validates payment_intent.succeeded payload', () => {
      const mockPayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_456',
            amount: 100000,
            currency: 'inr',
            status: 'succeeded',
            metadata: {
              orderId: 'order_123'
            }
          }
        }
      };

      const validate = ajv.compile(paymentIntentSucceededSchema);
      const isValid = validate(mockPayload);

      expect(isValid).toBe(true);
    });

    test('rejects payment_intent with invalid status', () => {
      const invalidPayload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_456',
            amount: 100000,
            currency: 'inr',
            status: 'failed'
          }
        }
      };

      const validate = ajv.compile(paymentIntentSucceededSchema);
      const isValid = validate(invalidPayload);

      expect(isValid).toBe(false);
    });
  });

  describe('Webhook Response Schema', () => {
    const webhookResponseSchema = {
      type: 'object',
      required: ['received', 'message'],
      properties: {
        received: { type: 'boolean' },
        message: { type: 'string' },
        orderId: { type: 'string' },
        error: { type: 'string' }
      }
    };

    test('validates successful webhook response', () => {
      const mockResponse = {
        received: true,
        message: 'Webhook processed successfully',
        orderId: 'order_123'
      };

      const validate = ajv.compile(webhookResponseSchema);
      const isValid = validate(mockResponse);

      expect(isValid).toBe(true);
    });

    test('validates error webhook response', () => {
      const mockResponse = {
        received: false,
        message: 'Webhook processing failed',
        error: 'Invalid signature'
      };

      const validate = ajv.compile(webhookResponseSchema);
      const isValid = validate(mockResponse);

      expect(isValid).toBe(true);
    });

    test('rejects response without required fields', () => {
      const invalidResponse = {
        received: true
      };

      const validate = ajv.compile(webhookResponseSchema);
      const isValid = validate(invalidResponse);

      expect(isValid).toBe(false);
    });
  });

  describe('Order Data Schema', () => {
    const orderDataSchema = {
      type: 'object',
      required: ['orderId', 'amount', 'currency', 'status', 'timestamp'],
      properties: {
        orderId: { type: 'string', minLength: 1 },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
        timestamp: { type: 'number' },
        customerEmail: { type: 'string', format: 'email' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'quantity', 'price'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              quantity: { type: 'number', minimum: 1 },
              price: { type: 'number', minimum: 0 }
            }
          }
        }
      }
    };

    test('validates complete order data', () => {
      const mockOrder = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'inr',
        status: 'completed',
        timestamp: 1700000000,
        customerEmail: 'test@example.com',
        items: [
          {
            id: 'cookie_1',
            name: 'Chocolate Chip Cookie',
            quantity: 2,
            price: 50000
          }
        ]
      };

      const validate = ajv.compile(orderDataSchema);
      const isValid = validate(mockOrder);

      expect(isValid).toBe(true);
    });

    test('rejects order with invalid status', () => {
      const invalidOrder = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'inr',
        status: 'invalid_status',
        timestamp: 1700000000
      };

      const validate = ajv.compile(orderDataSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
    });

    test('rejects order with negative amount', () => {
      const invalidOrder = {
        orderId: 'order_123',
        amount: -100,
        currency: 'inr',
        status: 'completed',
        timestamp: 1700000000
      };

      const validate = ajv.compile(orderDataSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
    });

    test('validates order without optional items array', () => {
      const orderWithoutItems = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'inr',
        status: 'completed',
        timestamp: 1700000000
      };

      const validate = ajv.compile(orderDataSchema);
      const isValid = validate(orderWithoutItems);

      expect(isValid).toBe(true);
    });
  });

  describe('Metadata Schema Validation', () => {
    test('validates order metadata structure', () => {
      const metadataSchema = {
        type: 'object',
        properties: {
          localOrderId: { type: 'string' },
          userId: { type: 'string' },
          cartItems: { type: 'string' },
          shippingAddress: { type: 'string' }
        },
        additionalProperties: true
      };

      const mockMetadata = {
        localOrderId: 'order_123',
        userId: 'user_456',
        cartItems: JSON.stringify([{ id: '1', qty: 2 }]),
        shippingAddress: JSON.stringify({
          street: '123 Main St',
          city: 'Mumbai'
        })
      };

      const validate = ajv.compile(metadataSchema);
      const isValid = validate(mockMetadata);

      expect(isValid).toBe(true);
    });

    test('validates metadata with additional custom fields', () => {
      const metadataSchema = {
        type: 'object',
        additionalProperties: true
      };

      const mockMetadata = {
        localOrderId: 'order_123',
        customField1: 'value1',
        customField2: 'value2',
        customField3: 123
      };

      const validate = ajv.compile(metadataSchema);
      const isValid = validate(mockMetadata);

      expect(isValid).toBe(true);
    });
  });

  describe('Error Response Schema', () => {
    const errorResponseSchema = {
      type: 'object',
      required: ['error', 'message'],
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        code: { type: 'string' },
        statusCode: { type: 'number' }
      }
    };

    test('validates error response structure', () => {
      const mockError = {
        error: 'ValidationError',
        message: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE',
        statusCode: 400
      };

      const validate = ajv.compile(errorResponseSchema);
      const isValid = validate(mockError);

      expect(isValid).toBe(true);
    });

    test('validates error response without optional fields', () => {
      const mockError = {
        error: 'ServerError',
        message: 'Internal server error'
      };

      const validate = ajv.compile(errorResponseSchema);
      const isValid = validate(mockError);

      expect(isValid).toBe(true);
    });
  });
});
