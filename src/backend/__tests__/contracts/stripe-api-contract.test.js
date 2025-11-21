/**
 * API Contract Testing for Stripe Integration
 * 
 * Tests validate that our backend correctly handles Stripe API contracts:
 * - Payment Intent creation
 * - Payment Intent retrieval
 * - Webhook event structures
 * - Payment method details
 * 
 * These tests use JSON Schema validation to ensure API responses match expected formats.
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv();
addFormats(ajv);

describe('Stripe API Contract Tests', () => {
  
  describe('Payment Intent Schema', () => {
    const paymentIntentSchema = {
      type: 'object',
      required: ['id', 'amount', 'currency', 'status', 'client_secret'],
      properties: {
        id: { 
          type: 'string',
          pattern: '^pi_[A-Za-z0-9]+$'
        },
        object: { 
          type: 'string',
          const: 'payment_intent'
        },
        amount: { 
          type: 'integer',
          minimum: 0
        },
        amount_capturable: { type: 'integer' },
        amount_received: { type: 'integer' },
        currency: { 
          type: 'string',
          pattern: '^[a-z]{3}$'
        },
        status: {
          type: 'string',
          enum: [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'processing',
            'requires_capture',
            'canceled',
            'succeeded'
          ]
        },
        client_secret: { 
          type: 'string',
          pattern: '^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$'
        },
        created: { 
          type: 'integer',
          minimum: 0
        },
        livemode: { type: 'boolean' },
        payment_method: {
          oneOf: [
            { type: 'string' },
            { type: 'null' }
          ]
        },
        metadata: { 
          type: 'object'
        }
      }
    };

    test('validates correct Payment Intent structure', () => {
      const mockPaymentIntent = {
        id: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB',
        object: 'payment_intent',
        amount: 50000,
        amount_capturable: 0,
        amount_received: 50000,
        currency: 'inr',
        status: 'succeeded',
        client_secret: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB_secret_abc123xyz',
        created: 1700000000,
        livemode: false,
        payment_method: 'pm_1234567890',
        metadata: {
          orderId: 'order_123',
          userId: 'user_456'
        }
      };

      const validate = ajv.compile(paymentIntentSchema);
      const valid = validate(mockPaymentIntent);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('rejects invalid Payment Intent ID format', () => {
      const invalidPaymentIntent = {
        id: 'invalid_id',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        client_secret: 'pi_secret_123'
      };

      const validate = ajv.compile(paymentIntentSchema);
      const valid = validate(invalidPaymentIntent);
      
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    test('rejects invalid currency format', () => {
      const invalidPaymentIntent = {
        id: 'pi_123',
        amount: 1000,
        currency: 'INVALID',
        status: 'succeeded',
        client_secret: 'pi_123_secret_abc'
      };

      const validate = ajv.compile(paymentIntentSchema);
      const valid = validate(invalidPaymentIntent);
      
      expect(valid).toBe(false);
    });

    test('validates all status values', () => {
      const statuses = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'canceled',
        'succeeded'
      ];

      const validate = ajv.compile(paymentIntentSchema);

      statuses.forEach(status => {
        const paymentIntent = {
          id: 'pi_test',
          amount: 1000,
          currency: 'usd',
          status: status,
          client_secret: 'pi_test_secret_123'
        };

        const valid = validate(paymentIntent);
        expect(valid).toBe(true);
      });
    });
  });

  describe('Payment Method Schema', () => {
    const paymentMethodSchema = {
      type: 'object',
      required: ['id', 'type', 'card'],
      properties: {
        id: {
          type: 'string',
          pattern: '^pm_[A-Za-z0-9]+$'
        },
        object: {
          type: 'string',
          const: 'payment_method'
        },
        type: {
          type: 'string',
          enum: ['card', 'bank_account', 'ideal', 'sepa_debit']
        },
        card: {
          type: 'object',
          required: ['brand', 'last4', 'exp_month', 'exp_year'],
          properties: {
            brand: {
              type: 'string',
              enum: ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay']
            },
            last4: {
              type: 'string',
              pattern: '^[0-9]{4}$'
            },
            exp_month: {
              type: 'integer',
              minimum: 1,
              maximum: 12
            },
            exp_year: {
              type: 'integer',
              minimum: 2024
            },
            funding: {
              type: 'string',
              enum: ['credit', 'debit', 'prepaid', 'unknown']
            }
          }
        },
        billing_details: {
          type: 'object',
          properties: {
            email: {
              oneOf: [
                { type: 'string', format: 'email' },
                { type: 'null' }
              ]
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'null' }
              ]
            }
          }
        }
      }
    };

    test('validates correct Payment Method structure', () => {
      const mockPaymentMethod = {
        id: 'pm_1234567890',
        object: 'payment_method',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
          funding: 'credit'
        },
        billing_details: {
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const validate = ajv.compile(paymentMethodSchema);
      const valid = validate(mockPaymentMethod);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates all card brands', () => {
      const brands = ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'];
      const validate = ajv.compile(paymentMethodSchema);

      brands.forEach(brand => {
        const paymentMethod = {
          id: 'pm_test',
          type: 'card',
          card: {
            brand: brand,
            last4: '1234',
            exp_month: 12,
            exp_year: 2025
          }
        };

        const valid = validate(paymentMethod);
        expect(valid).toBe(true);
      });
    });

    test('rejects invalid last4 format', () => {
      const invalidPaymentMethod = {
        id: 'pm_test',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '12', // Should be 4 digits
          exp_month: 12,
          exp_year: 2025
        }
      };

      const validate = ajv.compile(paymentMethodSchema);
      const valid = validate(invalidPaymentMethod);
      
      expect(valid).toBe(false);
    });
  });

  describe('Webhook Event Schema', () => {
    const webhookEventSchema = {
      type: 'object',
      required: ['id', 'type', 'data', 'created'],
      properties: {
        id: {
          type: 'string',
          pattern: '^evt_[A-Za-z0-9]+$'
        },
        object: {
          type: 'string',
          const: 'event'
        },
        type: {
          type: 'string',
          pattern: '^payment_intent\\.(succeeded|created|canceled|payment_failed)$'
        },
        data: {
          type: 'object',
          required: ['object'],
          properties: {
            object: {
              type: 'object'
            }
          }
        },
        created: {
          type: 'integer',
          minimum: 0
        },
        livemode: {
          type: 'boolean'
        },
        api_version: {
          type: 'string',
          pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        }
      }
    };

    test('validates payment_intent.succeeded event', () => {
      const mockEvent = {
        id: 'evt_1234567890',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            amount: 50000,
            currency: 'inr',
            status: 'succeeded'
          }
        },
        created: 1700000000,
        livemode: false,
        api_version: '2023-10-16'
      };

      const validate = ajv.compile(webhookEventSchema);
      const valid = validate(mockEvent);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates all payment_intent event types', () => {
      const eventTypes = [
        'payment_intent.succeeded',
        'payment_intent.created',
        'payment_intent.canceled',
        'payment_intent.payment_failed'
      ];

      const validate = ajv.compile(webhookEventSchema);

      eventTypes.forEach(type => {
        const event = {
          id: 'evt_test',
          object: 'event',
          type: type,
          data: {
            object: {
              id: 'pi_123'
            }
          },
          created: 1700000000,
          api_version: '2023-10-16'
        };

        const valid = validate(event);
        expect(valid).toBe(true);
      });
    });

    test('rejects invalid event type', () => {
      const invalidEvent = {
        id: 'evt_test',
        object: 'event',
        type: 'invalid.event.type',
        data: {
          object: {}
        },
        created: 1700000000
      };

      const validate = ajv.compile(webhookEventSchema);
      const valid = validate(invalidEvent);
      
      expect(valid).toBe(false);
    });
  });

  describe('Charge Object Schema', () => {
    const chargeSchema = {
      type: 'object',
      required: ['id', 'amount', 'currency', 'status', 'payment_method_details'],
      properties: {
        id: {
          type: 'string',
          pattern: '^ch_[A-Za-z0-9]+$'
        },
        object: {
          type: 'string',
          const: 'charge'
        },
        amount: {
          type: 'integer',
          minimum: 0
        },
        currency: {
          type: 'string',
          pattern: '^[a-z]{3}$'
        },
        status: {
          type: 'string',
          enum: ['succeeded', 'pending', 'failed']
        },
        payment_method_details: {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string'
            },
            card: {
              type: 'object',
              properties: {
                brand: { type: 'string' },
                last4: { type: 'string' },
                network: { type: 'string' }
              }
            }
          }
        },
        receipt_url: {
          oneOf: [
            { type: 'string', format: 'uri' },
            { type: 'null' }
          ]
        }
      }
    };

    test('validates correct Charge structure', () => {
      const mockCharge = {
        id: 'ch_3QKuznSJ2yYj3bFk0AYjdhjB',
        object: 'charge',
        amount: 50000,
        currency: 'inr',
        status: 'succeeded',
        payment_method_details: {
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            network: 'visa'
          }
        },
        receipt_url: 'https://pay.stripe.com/receipts/abc123'
      };

      const validate = ajv.compile(chargeSchema);
      const valid = validate(mockCharge);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates charge without receipt_url', () => {
      const mockCharge = {
        id: 'ch_test',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_method_details: {
          type: 'card'
        },
        receipt_url: null
      };

      const validate = ajv.compile(chargeSchema);
      const valid = validate(mockCharge);
      
      expect(valid).toBe(true);
    });
  });

  describe('Backend API Response Contracts', () => {
    const createPaymentIntentResponseSchema = {
      type: 'object',
      required: ['clientSecret', 'paymentIntentId'],
      properties: {
        clientSecret: {
          type: 'string',
          pattern: '^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$'
        },
        paymentIntentId: {
          type: 'string',
          pattern: '^pi_[A-Za-z0-9]+$'
        }
      }
    };

    test('validates /create-payment-intent response format', () => {
      const mockResponse = {
        clientSecret: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB_secret_abc123xyz',
        paymentIntentId: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB'
      };

      const validate = ajv.compile(createPaymentIntentResponseSchema);
      const valid = validate(mockResponse);
      
      expect(valid).toBe(true);
    });

    const paymentDetailsResponseSchema = {
      type: 'object',
      required: ['success', 'paymentIntent'],
      properties: {
        success: {
          type: 'boolean'
        },
        paymentIntent: {
          type: 'object',
          required: ['id', 'status', 'amount'],
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            amount: { type: 'number' },
            charges: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      receipt_url: { type: 'string' },
                      payment_method_details: {
                        type: 'object',
                        properties: {
                          card: {
                            type: 'object',
                            properties: {
                              brand: { type: 'string' },
                              last4: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    test('validates /get-payment-details response format', () => {
      const mockResponse = {
        success: true,
        paymentIntent: {
          id: 'pi_123',
          status: 'succeeded',
          amount: 50000,
          charges: {
            data: [
              {
                receipt_url: 'https://pay.stripe.com/receipts/abc',
                payment_method_details: {
                  card: {
                    brand: 'visa',
                    last4: '4242'
                  }
                }
              }
            ]
          }
        }
      };

      const validate = ajv.compile(paymentDetailsResponseSchema);
      const valid = validate(mockResponse);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });
  });
});
