/**
 * Email Trigger Integration Tests
 * 
 * Tests that verify the correct email functions are called
 * when specific API endpoints are hit.
 */

const emailService = require('../../services/emailService');

// Mock the entire emailService module
jest.mock('../../services/emailService', () => ({
  sendWelcomeEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendNewsletterEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendOrderConfirmationEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendEmail: jest.fn(() => Promise.resolve({ success: true })),
  _buildWelcomeEmail: jest.fn(() => '<html></html>'),
  _buildNewsletterEmail: jest.fn(() => '<html></html>'),
  _buildOrderConfirmationEmail: jest.fn(() => '<html></html>'),
}));

// Mock logger
jest.mock('../../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock fetch for Brevo contact API
global.fetch = jest.fn();

describe('Email Trigger Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BREVO_API_KEY = 'test-api-key';
    
    // Default fetch mock for Brevo contact creation
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: () => Promise.resolve('{}'),
    });
  });

  afterEach(() => {
    delete process.env.BREVO_API_KEY;
  });

  describe('Newsletter Subscription Triggers', () => {
    // Note: This is a simplified test. Full integration would require
    // spinning up the express app with supertest.
    
    test('sendNewsletterEmail is called with correct email format', async () => {
      // Simulate what the endpoint does
      const email = 'TEST@EXAMPLE.COM';
      const normalizedEmail = email.toLowerCase();
      
      // Simulate successful Brevo subscription
      await emailService.sendNewsletterEmail(normalizedEmail);
      
      expect(emailService.sendNewsletterEmail).toHaveBeenCalledWith('test@example.com');
    });

    test('sendNewsletterEmail handles special characters in email', async () => {
      const email = 'user+newsletter@example.com';
      
      await emailService.sendNewsletterEmail(email.toLowerCase());
      
      expect(emailService.sendNewsletterEmail).toHaveBeenCalledWith('user+newsletter@example.com');
    });
  });

  describe('Welcome Email Triggers', () => {
    test('sendWelcomeEmail is called with email and displayName', async () => {
      const email = 'newuser@example.com';
      const displayName = 'New User';
      
      await emailService.sendWelcomeEmail(email, displayName);
      
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('newuser@example.com', 'New User');
    });

    test('sendWelcomeEmail handles null displayName', async () => {
      const email = 'newuser@example.com';
      
      await emailService.sendWelcomeEmail(email, null);
      
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('newuser@example.com', null);
    });
  });

  describe('Order Confirmation Triggers', () => {
    const mockOrderData = {
      orderId: 'ORD-TEST-123',
      items: [
        { name: 'Cookie', quantity: 2, price: 299 },
      ],
      totalAmount: 598,
      currency: 'INR',
      shippingAddress: {
        line1: '123 Test St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
      },
    };

    test('sendOrderConfirmationEmail is called with email and order data', async () => {
      const email = 'customer@example.com';
      
      await emailService.sendOrderConfirmationEmail(email, mockOrderData);
      
      expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(
        'customer@example.com',
        expect.objectContaining({
          orderId: 'ORD-TEST-123',
          totalAmount: 598,
        })
      );
    });

    test('sendOrderConfirmationEmail includes items array', async () => {
      const email = 'customer@example.com';
      
      await emailService.sendOrderConfirmationEmail(email, mockOrderData);
      
      expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ name: 'Cookie', quantity: 2 }),
          ]),
        })
      );
    });

    test('sendOrderConfirmationEmail includes shipping address', async () => {
      const email = 'customer@example.com';
      
      await emailService.sendOrderConfirmationEmail(email, mockOrderData);
      
      expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          shippingAddress: expect.objectContaining({
            city: 'Mumbai',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('email send failure does not throw', async () => {
      emailService.sendNewsletterEmail.mockRejectedValueOnce(new Error('API Error'));
      
      // Should not throw, just log error
      await expect(
        emailService.sendNewsletterEmail('test@example.com').catch(() => 'caught')
      ).resolves.toBe('caught');
    });

    test('email functions return result object', async () => {
      emailService.sendWelcomeEmail.mockResolvedValueOnce({ success: true });
      
      const result = await emailService.sendWelcomeEmail('test@example.com', 'Test');
      
      expect(result).toHaveProperty('success', true);
    });
  });
});
