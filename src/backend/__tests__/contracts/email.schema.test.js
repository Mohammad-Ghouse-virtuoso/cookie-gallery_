/**
 * Email Payload Schema Contract Tests
 * 
 * Validates the structure of data passed to email functions
 * to ensure consistency between webhook handlers and email service.
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

describe('Email Payload Schema Tests', () => {
  let ajv;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  describe('Order Confirmation Email Schema', () => {
    /**
     * Schema for orderData passed to sendOrderConfirmationEmail
     * This contract must be maintained by:
     * - Stripe webhook handler (checkout.session.completed)
     * - /api/test-emails endpoint
     */
    const orderConfirmationSchema = {
      type: 'object',
      required: ['totalAmount'],
      properties: {
        orderId: { 
          type: 'string',
          description: 'Unique order identifier'
        },
        customerName: { 
          type: 'string',
          description: 'Customer display name for greeting'
        },
        customerEmail: { 
          type: 'string',
          format: 'email',
          description: 'Customer email (recipient)'
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'quantity', 'price'],
            properties: {
              name: { type: 'string', minLength: 1 },
              quantity: { type: 'integer', minimum: 1 },
              price: { type: 'number', minimum: 0 },
            },
          },
          description: 'Array of ordered items'
        },
        totalAmount: { 
          type: 'number',
          minimum: 0,
          description: 'Total order amount'
        },
        currency: { 
          type: 'string',
          pattern: '^[A-Z]{3}$',
          default: 'INR',
          description: 'ISO 4217 currency code'
        },
        shippingAddress: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            phone: { type: 'string' },
          },
          description: 'Shipping/delivery address'
        },
        orderDate: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 order timestamp'
        },
      },
      additionalProperties: true, // Allow extra fields for flexibility
    };

    test('validates complete order data', () => {
      const validOrder = {
        orderId: 'ORD-12345',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          { name: 'Chocolate Chip Cookie', quantity: 6, price: 299 },
          { name: 'Vanilla Cookie', quantity: 4, price: 249 },
        ],
        totalAmount: 2790,
        currency: 'INR',
        shippingAddress: {
          name: 'John Doe',
          line1: '123 Baker Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
          phone: '+91 9876543210',
        },
        orderDate: '2025-12-03T12:00:00.000Z',
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(validOrder);

      expect(isValid).toBe(true);
    });

    test('validates minimal order data (only required fields)', () => {
      const minimalOrder = {
        totalAmount: 500,
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(minimalOrder);

      expect(isValid).toBe(true);
    });

    test('rejects order with negative total', () => {
      const invalidOrder = {
        totalAmount: -100,
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
      expect(validate.errors[0].message).toContain('>=');
    });

    test('rejects item with zero quantity', () => {
      const invalidOrder = {
        totalAmount: 500,
        items: [
          { name: 'Cookie', quantity: 0, price: 299 },
        ],
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
    });

    test('rejects item with empty name', () => {
      const invalidOrder = {
        totalAmount: 500,
        items: [
          { name: '', quantity: 2, price: 299 },
        ],
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
    });

    test('rejects invalid currency code format', () => {
      const invalidOrder = {
        totalAmount: 500,
        currency: 'rupees', // Should be 3-letter uppercase
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(invalidOrder);

      expect(isValid).toBe(false);
    });

    test('validates order with empty items array', () => {
      const orderNoItems = {
        totalAmount: 0,
        items: [],
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(orderNoItems);

      expect(isValid).toBe(true);
    });

    test('validates order with partial shipping address', () => {
      const partialAddress = {
        totalAmount: 500,
        shippingAddress: {
          city: 'Mumbai',
        },
      };

      const validate = ajv.compile(orderConfirmationSchema);
      const isValid = validate(partialAddress);

      expect(isValid).toBe(true);
    });
  });

  describe('Welcome Email Schema', () => {
    const welcomeEmailSchema = {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        displayName: { type: ['string', 'null'] },
      },
    };

    test('validates welcome email with displayName', () => {
      const data = {
        email: 'user@example.com',
        displayName: 'John Doe',
      };

      const validate = ajv.compile(welcomeEmailSchema);
      expect(validate(data)).toBe(true);
    });

    test('validates welcome email with null displayName', () => {
      const data = {
        email: 'user@example.com',
        displayName: null,
      };

      const validate = ajv.compile(welcomeEmailSchema);
      expect(validate(data)).toBe(true);
    });

    test('rejects invalid email format', () => {
      const data = {
        email: 'not-an-email',
        displayName: 'Test',
      };

      const validate = ajv.compile(welcomeEmailSchema);
      expect(validate(data)).toBe(false);
    });
  });

  describe('Newsletter Email Schema', () => {
    const newsletterSchema = {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };

    test('validates newsletter subscription email', () => {
      const data = {
        email: 'subscriber@example.com',
      };

      const validate = ajv.compile(newsletterSchema);
      expect(validate(data)).toBe(true);
    });

    test('rejects empty email', () => {
      const data = {
        email: '',
      };

      const validate = ajv.compile(newsletterSchema);
      expect(validate(data)).toBe(false);
    });
  });
});
