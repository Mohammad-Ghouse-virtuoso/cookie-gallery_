/**
 * Email Service for Cookie Gallery
 * Handles all transactional emails via Brevo API
 */

const logger = require('../logger');

// Use node-fetch if global.fetch is not available (for older Node versions or Railway)
const fetch = global.fetch || require('node-fetch');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = 'alerts@cookiegallery.mohammad-ghouse.site';
const SENDER_NAME = 'Cookie Gallery';
const SITE_URL = 'https://cookiegallery.mohammad-ghouse.site';

// Shared email styles
const styles = {
  container: `font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fef3e2 0%, #fff8f0 100%); border-radius: 16px; overflow: hidden;`,
  header: `background: #5b3a20; padding: 30px 20px; text-align: center;`,
  headerTitle: `color: #fff; font-size: 28px; margin: 0; letter-spacing: 1px;`,
  headerCookie: `font-size: 40px; display: block; margin-bottom: 10px;`,
  body: `padding: 40px 30px;`,
  h1: `color: #5b3a20; text-align: center; font-size: 26px; margin: 0 0 20px 0;`,
  h2: `color: #5b3a20; font-size: 20px; margin: 25px 0 15px 0;`,
  p: `color: #6b5344; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;`,
  pCenter: `color: #6b5344; font-size: 16px; line-height: 1.8; text-align: center; margin: 0 0 15px 0;`,
  button: `display: inline-block; background: #5b3a20; color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;`,
  buttonContainer: `text-align: center; margin: 30px 0;`,
  divider: `border: none; border-top: 2px dashed #d4a574; margin: 25px 0;`,
  footer: `background: #5b3a20; padding: 25px 20px; text-align: center;`,
  footerText: `color: #d4a574; font-size: 14px; margin: 0 0 10px 0;`,
  footerLink: `color: #fff; text-decoration: none; margin: 0 10px;`,
  highlight: `background: #fff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #e8d5c4;`,
  orderTable: `width: 100%; border-collapse: collapse; margin: 15px 0;`,
  orderTh: `text-align: left; padding: 10px; border-bottom: 2px solid #d4a574; color: #5b3a20;`,
  orderTd: `padding: 10px; border-bottom: 1px solid #e8d5c4; color: #6b5344;`,
  badge: `display: inline-block; background: #d4a574; color: #5b3a20; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;`,
};

// Email footer (shared across all emails)
const emailFooter = `
  <div style="${styles.footer}">
    <p style="${styles.footerText}">
      Baked with love by The Cookie Gallery Team 🍪
    </p>
    <p style="margin: 15px 0 0 0;">
      <a href="${SITE_URL}" style="${styles.footerLink}">Visit Store</a>
      <span style="color: #d4a574;">|</span>
      <a href="${SITE_URL}/privacy" style="${styles.footerLink}">Privacy Policy</a>
    </p>
    <p style="color: #8b7355; font-size: 12px; margin-top: 15px;">
      © ${new Date().getFullYear()} Cookie Gallery. All rights reserved.
    </p>
  </div>
`;

/**
 * Send email via Brevo API
 */
async function sendEmail({ to, subject, htmlContent }) {
  if (!BREVO_API_KEY) {
    logger.warn('Email not sent: BREVO_API_KEY not configured');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to.toLowerCase() }],
        subject,
        htmlContent,
      }),
    });

    const result = await response.text();
    
    if (response.ok) {
      logger.info('Email sent successfully', { to, subject });
      return { success: true };
    } else {
      logger.error('Failed to send email', { to, subject, status: response.status, response: result });
      return { success: false, error: result };
    }
  } catch (error) {
    logger.error('Email send error', { to, subject, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Welcome Email - Sent when user signs in for the first time
 */
function buildWelcomeEmail(displayName) {
  const name = displayName || 'Cookie Lover';
  
  return `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <span style="${styles.headerCookie}">🍪</span>
        <h1 style="${styles.headerTitle}">Cookie Gallery</h1>
      </div>
      
      <div style="${styles.body}">
        <h1 style="${styles.h1}">Welcome, ${name}! 🎉</h1>
        
        <p style="${styles.pCenter}">
          You've just unlocked a world of handcrafted, melt-in-your-mouth cookies. 
          We're thrilled to have you in our sweet family!
        </p>
        
        <div style="${styles.highlight}">
          <p style="text-align: center; margin: 0; color: #5b3a20; font-size: 18px;">
            🎁 <strong>What awaits you:</strong>
          </p>
          <ul style="color: #6b5344; line-height: 2; margin: 15px 0 0 20px; padding: 0;">
            <li>Artisan cookies baked fresh for every order</li>
            <li>Unique flavors you won't find anywhere else</li>
            <li>Beautiful gift packaging options</li>
            <li>Early access to seasonal specials</li>
          </ul>
        </div>
        
        <div style="${styles.buttonContainer}">
          <a href="${SITE_URL}/cookies" style="${styles.button}">
            Explore Our Cookies 🍪
          </a>
        </div>
        
        <hr style="${styles.divider}">
        
        <p style="${styles.pCenter}">
          <em>Every cookie tells a story. Let us bake yours.</em>
        </p>
      </div>
      
      ${emailFooter}
    </div>
  `;
}

/**
 * Newsletter Subscription Email - VIP list welcome
 */
function buildNewsletterEmail() {
  return `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <span style="${styles.headerCookie}">🎁</span>
        <h1 style="${styles.headerTitle}">Cookie Gallery</h1>
      </div>
      
      <div style="${styles.body}">
        <h1 style="${styles.h1}">You're on the VIP List! 🌟</h1>
        
        <p style="${styles.pCenter}">
          Consider yourself officially part of our inner circle. 
          You'll be the first to know about everything delicious!
        </p>
        
        <div style="${styles.highlight}">
          <p style="text-align: center; margin: 0;">
            <span style="${styles.badge}">✨ VIP PERKS ✨</span>
          </p>
          <ul style="color: #6b5344; line-height: 2.2; margin: 20px 0 0 20px; padding: 0;">
            <li>🍪 First dibs on new cookie flavors</li>
            <li>🎉 Exclusive subscriber-only offers</li>
            <li>🎂 Birthday surprises (we love celebrating!)</li>
            <li>📦 Early access to limited edition boxes</li>
            <li>💌 Behind-the-scenes baking stories</li>
          </ul>
        </div>
        
        <div style="${styles.buttonContainer}">
          <a href="${SITE_URL}" style="${styles.button}">
            Start Shopping 🛒
          </a>
        </div>
        
        <hr style="${styles.divider}">
        
        <p style="${styles.pCenter}">
          <strong>P.S.</strong> Keep an eye on your inbox — 
          something sweet is always around the corner! 🍪
        </p>
      </div>
      
      ${emailFooter}
    </div>
  `;
}

/**
 * Order Confirmation Email - Sent after successful payment
 */
function buildOrderConfirmationEmail(orderData) {
  const {
    orderId,
    customerName,
    customerEmail,
    items = [],
    totalAmount,
    currency = 'INR',
    shippingAddress = {},
    orderDate,
  } = orderData;

  const formattedDate = orderDate 
    ? new Date(orderDate).toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Build items table
  let itemsHtml = '';
  if (items.length > 0) {
    itemsHtml = `
      <table style="${styles.orderTable}">
        <thead>
          <tr>
            <th style="${styles.orderTh}">Item</th>
            <th style="${styles.orderTh}">Qty</th>
            <th style="${styles.orderTh}; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="${styles.orderTd}">${item.name || 'Cookie'}</td>
              <td style="${styles.orderTd}">${item.quantity || 1}</td>
              <td style="${styles.orderTd}; text-align: right;">${formatPrice(item.price || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Build address section
  const addressHtml = shippingAddress.line1 ? `
    <div style="${styles.highlight}">
      <h2 style="${styles.h2}; margin-top: 0;">📍 Delivery Address</h2>
      <p style="${styles.p}; margin: 0;">
        <strong>${shippingAddress.name || customerName || 'Customer'}</strong><br>
        ${shippingAddress.line1 || ''}<br>
        ${shippingAddress.line2 ? shippingAddress.line2 + '<br>' : ''}
        ${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postalCode || ''}<br>
        ${shippingAddress.phone ? '📞 ' + shippingAddress.phone : ''}
      </p>
    </div>
  ` : '';

  return `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <span style="${styles.headerCookie}">✅</span>
        <h1 style="${styles.headerTitle}">Order Confirmed!</h1>
      </div>
      
      <div style="${styles.body}">
        <h1 style="${styles.h1}">Thank you for your order! 🎉</h1>
        
        <p style="${styles.pCenter}">
          Hey ${customerName || 'there'}! Your cookies are doing a happy dance. 
          We're preparing your order with extra love and care.
        </p>
        
        <div style="${styles.highlight}">
          <p style="text-align: center; margin: 0 0 15px 0;">
            <span style="${styles.badge}">Order #${orderId || 'N/A'}</span>
          </p>
          <p style="${styles.pCenter}; margin: 0;">
            <strong>Placed on:</strong> ${formattedDate}
          </p>
        </div>
        
        ${items.length > 0 ? `
          <h2 style="${styles.h2}">🍪 Order Summary</h2>
          ${itemsHtml}
          <p style="text-align: right; font-size: 18px; color: #5b3a20; margin: 15px 0;">
            <strong>Total: ${formatPrice(totalAmount || 0)}</strong>
          </p>
        ` : `
          <div style="${styles.highlight}">
            <p style="${styles.pCenter}; margin: 0; font-size: 18px;">
              <strong>Order Total: ${formatPrice(totalAmount || 0)}</strong>
            </p>
          </div>
        `}
        
        ${addressHtml}
        
        <hr style="${styles.divider}">
        
        <div style="${styles.buttonContainer}">
          <a href="${SITE_URL}/orders" style="${styles.button}">
            View Your Orders 📦
          </a>
        </div>
        
        <p style="${styles.pCenter}">
          <em>Questions about your order? Just reply to this email — we're here to help!</em>
        </p>
      </div>
      
      ${emailFooter}
    </div>
  `;
}

// Export email functions
module.exports = {
  sendEmail,
  
  // Expose builders for testing (prefixed with _ to indicate internal use)
  _buildWelcomeEmail: buildWelcomeEmail,
  _buildNewsletterEmail: buildNewsletterEmail,
  _buildOrderConfirmationEmail: buildOrderConfirmationEmail,
  
  // Welcome email for first-time sign-in
  async sendWelcomeEmail(email, displayName) {
    return sendEmail({
      to: email,
      subject: '🍪 Welcome to Cookie Gallery!',
      htmlContent: buildWelcomeEmail(displayName),
    });
  },

  // Newsletter subscription email
  async sendNewsletterEmail(email) {
    return sendEmail({
      to: email,
      subject: '🎁 You\'re on the VIP List! | Cookie Gallery',
      htmlContent: buildNewsletterEmail(),
    });
  },

  // Order confirmation email
  async sendOrderConfirmationEmail(email, orderData) {
    return sendEmail({
      to: email,
      subject: `✅ Order Confirmed! #${orderData.orderId || 'N/A'} | Cookie Gallery`,
      htmlContent: buildOrderConfirmationEmail(orderData),
    });
  },
};
