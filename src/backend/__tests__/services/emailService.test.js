/**
 * Email Service Unit Tests
 * 
 * Tests for email template builders and sendEmail function.
 * Uses fetch mocking to avoid real API calls.
 */

// Set env before requiring module (captured at load time)
process.env.BREVO_API_KEY = 'test-api-key-for-tests';

// Mock fetch globally BEFORE requiring emailService
global.fetch = jest.fn();

// Mock logger to prevent console noise
jest.mock('../../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Now require the service (after env is set)
const emailService = require('../../services/emailService');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock for each test
    global.fetch.mockReset();
  });

  describe('Template Builders', () => {
    describe('buildWelcomeEmail', () => {
      test('includes personalized greeting with display name', () => {
        const html = emailService._buildWelcomeEmail('John');
        
        expect(html).toContain('Welcome, John!');
        expect(html).toContain('Cookie Gallery');
      });

      test('uses fallback greeting when displayName is null', () => {
        const html = emailService._buildWelcomeEmail(null);
        
        expect(html).toContain('Welcome, Cookie Lover!');
      });

      test('uses fallback greeting when displayName is undefined', () => {
        const html = emailService._buildWelcomeEmail(undefined);
        
        expect(html).toContain('Welcome, Cookie Lover!');
      });

      test('uses fallback greeting when displayName is empty string', () => {
        const html = emailService._buildWelcomeEmail('');
        
        expect(html).toContain('Welcome, Cookie Lover!');
      });

      test('includes call-to-action button', () => {
        const html = emailService._buildWelcomeEmail('Test');
        
        expect(html).toContain('Explore Our Cookies');
        expect(html).toContain('/cookies');
      });

      test('includes footer with site links', () => {
        const html = emailService._buildWelcomeEmail('Test');
        
        expect(html).toContain('Baked with love');
        expect(html).toContain('Privacy Policy');
      });
    });

    describe('buildNewsletterEmail', () => {
      test('includes VIP badge', () => {
        const html = emailService._buildNewsletterEmail();
        
        expect(html).toContain('VIP');
        expect(html).toContain('You\'re on the VIP List!');
      });

      test('includes subscriber perks list', () => {
        const html = emailService._buildNewsletterEmail();
        
        expect(html).toContain('First dibs on new cookie flavors');
        expect(html).toContain('Exclusive subscriber-only offers');
        expect(html).toContain('Birthday surprises');
      });

      test('includes call-to-action button', () => {
        const html = emailService._buildNewsletterEmail();
        
        expect(html).toContain('Start Shopping');
      });
    });

    describe('buildOrderConfirmationEmail', () => {
      const validOrderData = {
        orderId: 'ORD-12345',
        customerName: 'Jane Doe',
        items: [
          { name: 'Chocolate Chip Cookie', quantity: 6, price: 299 },
          { name: 'Double Chocolate Cookie', quantity: 4, price: 349 },
        ],
        totalAmount: 4190,
        currency: 'INR',
        shippingAddress: {
          name: 'Jane Doe',
          line1: '123 Baker Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          phone: '+91 9876543210',
        },
      };

      test('includes order ID in badge', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        expect(html).toContain('Order #ORD-12345');
      });

      test('includes customer name in greeting', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        expect(html).toContain('Hey Jane Doe!');
      });

      test('renders all order items', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        expect(html).toContain('Chocolate Chip Cookie');
        expect(html).toContain('Double Chocolate Cookie');
      });

      test('renders item quantities', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        // Check quantities are present in table
        expect(html).toMatch(/<td[^>]*>6<\/td>/);
        expect(html).toMatch(/<td[^>]*>4<\/td>/);
      });

      test('formats prices in INR currency', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        // Indian Rupee formatting: ₹ symbol
        expect(html).toContain('₹');
      });

      test('includes shipping address', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        expect(html).toContain('123 Baker Street');
        expect(html).toContain('Mumbai');
        expect(html).toContain('Maharashtra');
        expect(html).toContain('400001');
      });

      test('handles missing customerName gracefully', () => {
        const orderWithNoName = { ...validOrderData, customerName: undefined };
        const html = emailService._buildOrderConfirmationEmail(orderWithNoName);
        
        expect(html).toContain('Hey there!');
      });

      test('handles empty items array', () => {
        const orderNoItems = { ...validOrderData, items: [] };
        const html = emailService._buildOrderConfirmationEmail(orderNoItems);
        
        // Should still show total without table
        expect(html).toContain('Order Total');
        expect(html).not.toContain('<thead>');
      });

      test('handles missing orderId', () => {
        const orderNoId = { ...validOrderData, orderId: undefined };
        const html = emailService._buildOrderConfirmationEmail(orderNoId);
        
        expect(html).toContain('Order #N/A');
      });

      test('handles missing shippingAddress', () => {
        const orderNoAddress = { ...validOrderData, shippingAddress: {} };
        const html = emailService._buildOrderConfirmationEmail(orderNoAddress);
        
        // Should not include address section
        expect(html).not.toContain('Delivery Address');
      });

      test('includes View Orders button', () => {
        const html = emailService._buildOrderConfirmationEmail(validOrderData);
        
        expect(html).toContain('View Your Orders');
        expect(html).toContain('/orders');
      });
    });
  });

  describe('sendEmail', () => {
    test('sends email successfully when API returns 200', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ messageId: 'msg-123' })),
      });

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'test-api-key-for-tests',
          }),
        })
      );
    });

    test('lowercases email address', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{}'),
      });

      await emailService.sendEmail({
        to: 'TEST@EXAMPLE.COM',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.to[0].email).toBe('test@example.com');
    });

    test('returns failure with error message on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message":"Invalid email"}'),
      });

      const result = await emailService.sendEmail({
        to: 'invalid',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    test('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('Wrapper Functions', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{}'),
      });
    });

    describe('sendWelcomeEmail', () => {
      test('sends email with correct subject', async () => {
        await emailService.sendWelcomeEmail('user@test.com', 'Alice');

        const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(callBody.subject).toBe('🍪 Welcome to Cookie Gallery!');
      });

      test('includes personalized content', async () => {
        await emailService.sendWelcomeEmail('user@test.com', 'Bob');

        const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(callBody.htmlContent).toContain('Welcome, Bob!');
      });
    });

    describe('sendNewsletterEmail', () => {
      test('sends email with VIP subject', async () => {
        await emailService.sendNewsletterEmail('subscriber@test.com');

        const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(callBody.subject).toContain('VIP List');
      });
    });

    describe('sendOrderConfirmationEmail', () => {
      test('sends email with order ID in subject', async () => {
        await emailService.sendOrderConfirmationEmail('customer@test.com', {
          orderId: 'TEST-789',
          totalAmount: 1000,
        });

        const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(callBody.subject).toContain('#TEST-789');
      });

      test('handles missing orderId in subject', async () => {
        await emailService.sendOrderConfirmationEmail('customer@test.com', {
          totalAmount: 1000,
        });

        const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(callBody.subject).toContain('#N/A');
      });
    });
  });
});
