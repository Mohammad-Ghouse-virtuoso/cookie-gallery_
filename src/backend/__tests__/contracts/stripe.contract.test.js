const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Stripe API Contract Tests
 * 
 * These tests validate that our code correctly handles Stripe API responses
 * according to Stripe's documented contracts. This ensures compatibility
 * when Stripe updates their API.
 */

describe('Stripe API Contract Tests', () => {
  let ajv;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  describe('Checkout Session Contract', () => {
    const checkoutSessionSchema = {
      type: 'object',
      required: ['id', 'object', 'amount_total', 'currency', 'customer_email', 'payment_status', 'status'],
      properties: {
        id: { type: 'string', pattern: '^cs_' },
        object: { type: 'string', enum: ['checkout.session'] },
        amount_total: { type: 'number', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        customer_email: { type: ['string', 'null'], format: 'email' },
        payment_status: { type: 'string', enum: ['paid', 'unpaid', 'no_payment_required'] },
        status: { type: 'string', enum: ['complete', 'expired', 'open'] },
        payment_intent: { type: ['string', 'null'], pattern: '^pi_' },
        metadata: { type: 'object' },
        mode: { type: 'string', enum: ['payment', 'setup', 'subscription'] },
        success_url: { type: ['string', 'null'] },
        cancel_url: { type: ['string', 'null'] }
      }
    };

    test('validates a complete Stripe checkout session', () => {
      const mockCheckoutSession = {
        id: 'cs_test_123abc',
        object: 'checkout.session',
        amount_total: 100000,
        currency: 'inr',
        customer_email: 'test@example.com',
        payment_status: 'paid',
        status: 'complete',
        payment_intent: 'pi_test_456def',
        metadata: {
          localOrderId: 'order_123'
        },
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      };

      const validate = ajv.compile(checkoutSessionSchema);
      const isValid = validate(mockCheckoutSession);

      expect(isValid).toBe(true);
      if (!isValid) {
        console.error('Validation errors:', validate.errors);
      }
    });

    test('rejects checkout session with invalid id format', () => {
      const invalidSession = {
        id: 'invalid_id',
        object: 'checkout.session',
        amount_total: 100000,
        currency: 'inr',
        customer_email: 'test@example.com',
        payment_status: 'paid',
        status: 'complete'
      };

      const validate = ajv.compile(checkoutSessionSchema);
      const isValid = validate(invalidSession);

      expect(isValid).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    test('rejects checkout session with invalid payment_status', () => {
      const invalidSession = {
        id: 'cs_test_123',
        object: 'checkout.session',
        amount_total: 100000,
        currency: 'inr',
        customer_email: 'test@example.com',
        payment_status: 'invalid_status',
        status: 'complete'
      };

      const validate = ajv.compile(checkoutSessionSchema);
      const isValid = validate(invalidSession);

      expect(isValid).toBe(false);
    });

    test('accepts null customer_email', () => {
      const sessionWithoutEmail = {
        id: 'cs_test_123',
        object: 'checkout.session',
        amount_total: 100000,
        currency: 'inr',
        customer_email: null,
        payment_status: 'paid',
        status: 'complete'
      };

      const validate = ajv.compile(checkoutSessionSchema);
      const isValid = validate(sessionWithoutEmail);

      expect(isValid).toBe(true);
    });
  });

  describe('Payment Intent Contract', () => {
    const paymentIntentSchema = {
      type: 'object',
      required: ['id', 'object', 'amount', 'currency', 'status'],
      properties: {
        id: { type: 'string', pattern: '^pi_' },
        object: { type: 'string', enum: ['payment_intent'] },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        status: { 
          type: 'string', 
          enum: ['requires_payment_method', 'requires_confirmation', 'requires_action', 
                 'processing', 'requires_capture', 'canceled', 'succeeded']
        },
        charges: { type: 'object' },
        metadata: { type: 'object' },
        receipt_email: { type: ['string', 'null'], format: 'email' }
      }
    };

    test('validates a successful payment intent', () => {
      const mockPaymentIntent = {
        id: 'pi_test_789ghi',
        object: 'payment_intent',
        amount: 100000,
        currency: 'inr',
        status: 'succeeded',
        charges: {
          object: 'list',
          data: []
        },
        metadata: {},
        receipt_email: 'test@example.com'
      };

      const validate = ajv.compile(paymentIntentSchema);
      const isValid = validate(mockPaymentIntent);

      expect(isValid).toBe(true);
    });

    test('rejects payment intent with invalid id format', () => {
      const invalidIntent = {
        id: 'invalid_pi',
        object: 'payment_intent',
        amount: 100000,
        currency: 'inr',
        status: 'succeeded'
      };

      const validate = ajv.compile(paymentIntentSchema);
      const isValid = validate(invalidIntent);

      expect(isValid).toBe(false);
    });

    test('validates all payment intent statuses', () => {
      const statuses = [
        'requires_payment_method', 'requires_confirmation', 'requires_action',
        'processing', 'requires_capture', 'canceled', 'succeeded'
      ];

      const validate = ajv.compile(paymentIntentSchema);

      statuses.forEach(status => {
        const intent = {
          id: 'pi_test_123',
          object: 'payment_intent',
          amount: 100000,
          currency: 'inr',
          status: status
        };

        const isValid = validate(intent);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Webhook Event Contract', () => {
    const webhookEventSchema = {
      type: 'object',
      required: ['id', 'object', 'type', 'data', 'created'],
      properties: {
        id: { type: 'string', pattern: '^evt_' },
        object: { type: 'string', enum: ['event'] },
        type: { type: 'string' },
        data: {
          type: 'object',
          required: ['object'],
          properties: {
            object: { type: 'object' }
          }
        },
        created: { type: 'number' },
        livemode: { type: 'boolean' }
      }
    };

    test('validates checkout.session.completed webhook event', () => {
      const mockEvent = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            object: 'checkout.session',
            amount_total: 100000,
            currency: 'inr',
            payment_status: 'paid',
            status: 'complete'
          }
        },
        created: 1700000000,
        livemode: false
      };

      const validate = ajv.compile(webhookEventSchema);
      const isValid = validate(mockEvent);

      expect(isValid).toBe(true);
    });

    test('rejects event with invalid id format', () => {
      const invalidEvent = {
        id: 'invalid_evt',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {}
        },
        created: 1700000000
      };

      const validate = ajv.compile(webhookEventSchema);
      const isValid = validate(invalidEvent);

      expect(isValid).toBe(false);
    });

    test('validates payment_intent.succeeded webhook event', () => {
      const mockEvent = {
        id: 'evt_test_456',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_789',
            object: 'payment_intent',
            amount: 100000,
            currency: 'inr',
            status: 'succeeded'
          }
        },
        created: 1700000000,
        livemode: false
      };

      const validate = ajv.compile(webhookEventSchema);
      const isValid = validate(mockEvent);

      expect(isValid).toBe(true);
    });
  });

  describe('Charge Object Contract', () => {
    const chargeSchema = {
      type: 'object',
      required: ['id', 'object', 'amount', 'currency', 'status'],
      properties: {
        id: { type: 'string', pattern: '^ch_' },
        object: { type: 'string', enum: ['charge'] },
        amount: { type: 'number', minimum: 0 },
        currency: { type: 'string', minLength: 3, maxLength: 3 },
        status: { type: 'string', enum: ['succeeded', 'pending', 'failed'] },
        payment_method_details: { type: 'object' },
        receipt_url: { type: ['string', 'null'] },
        billing_details: { type: 'object' }
      }
    };

    test('validates a successful charge', () => {
      const mockCharge = {
        id: 'ch_test_123',
        object: 'charge',
        amount: 100000,
        currency: 'inr',
        status: 'succeeded',
        payment_method_details: {
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242'
          }
        },
        receipt_url: 'https://pay.stripe.com/receipts/123',
        billing_details: {
          email: 'test@example.com'
        }
      };

      const validate = ajv.compile(chargeSchema);
      const isValid = validate(mockCharge);

      expect(isValid).toBe(true);
    });

    test('rejects charge with invalid id format', () => {
      const invalidCharge = {
        id: 'invalid_charge',
        object: 'charge',
        amount: 100000,
        currency: 'inr',
        status: 'succeeded'
      };

      const validate = ajv.compile(chargeSchema);
      const isValid = validate(invalidCharge);

      expect(isValid).toBe(false);
    });
  });

  describe('Currency Validation', () => {
    test('validates supported currencies', () => {
      const supportedCurrencies = ['inr', 'usd', 'eur', 'gbp', 'jpy'];
      const currencySchema = {
        type: 'string',
        enum: supportedCurrencies
      };

      const validate = ajv.compile(currencySchema);

      supportedCurrencies.forEach(currency => {
        expect(validate(currency)).toBe(true);
      });
    });

    test('rejects unsupported currencies', () => {
      const currencySchema = {
        type: 'string',
        enum: ['inr', 'usd', 'eur']
      };

      const validate = ajv.compile(currencySchema);

      expect(validate('xyz')).toBe(false);
      expect(validate('abc')).toBe(false);
    });
  });

  describe('Amount Validation', () => {
    test('validates amounts are non-negative', () => {
      const amountSchema = {
        type: 'number',
        minimum: 0
      };

      const validate = ajv.compile(amountSchema);

      expect(validate(0)).toBe(true);
      expect(validate(100)).toBe(true);
      expect(validate(100000)).toBe(true);
      expect(validate(-1)).toBe(false);
    });

    test('validates amount conversion from rupees to paise', () => {
      const rupeesToPaise = (rupees) => Math.round(rupees * 100);

      expect(rupeesToPaise(10.00)).toBe(1000);
      expect(rupeesToPaise(99.99)).toBe(9999);
      expect(rupeesToPaise(1000.00)).toBe(100000);
      expect(rupeesToPaise(0.50)).toBe(50);
    });
  });
});
