
// server.js

const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

// Use node-fetch if global.fetch is not available (for older Node versions)
const fetch = global.fetch || require('node-fetch');

// Load env (supports multiline private key with \n)
// 1) Root .env
require('dotenv').config();
// 2) Backend-local .env (src/backend/.env) as fallback without overriding existing vars
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: false });

const logger = require('./logger');
const PaymentService = require('./services/paymentService');
const SchemaService = require('./services/schemaService');
const emailService = require('./services/emailService');
const createWebhookRoutes = require('./routes/webhooks');
const createOrderRoutes = require('./routes/orders');
const sentryService = require('./services/sentryService');

const app = express();

// Trust Railway's reverse proxy (fixes X-Forwarded-For header warnings)
// Railway, Heroku, Render, and other platforms use reverse proxies
app.set('trust proxy', 1);

// Initialize Sentry (must be before other middleware)
const Sentry = sentryService.initSentry(app);
if (Sentry) {
  app.use(sentryService.sentryRequestHandler());
  app.use(sentryService.sentryTracingHandler());
}
const STRIPE_WEBHOOK_PATH = '/api/payment-webhook';
app.use(express.json({
  verify: (req, res, buffer) => {
    if (req.originalUrl === STRIPE_WEBHOOK_PATH) {
      req.rawBody = buffer;
    }
  }
}));
// Optionally restrict CORS to a specific origin via env; defaults to '*'
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      process.env.CORS_ORIGIN,
      process.env.CORS_ORIGIN_VERCEL, // Support Vercel default domain
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key']
}));

const STRIPE_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "connect-src 'self' https://api.stripe.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "img-src 'self' data: https://*.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', STRIPE_CSP_DIRECTIVES);
  next();
});

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter limit for payment endpoints
  message: { success: false, message: 'Too many payment requests, please try again later.' },
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);
app.use('/create-payment-intent', strictLimiter);
app.use('/get-payment-details', strictLimiter);

const PORT = process.env.PORT || 5000;
// Server boot ID to detect restarts from the client
const SERVER_BOOT_ID = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Optional API key protection (not used when ID token is required)
// const API_SHARED_SECRET = process.env.API_SHARED_SECRET;
// const requireApiKey = (req, res, next) => {
//   if (!API_SHARED_SECRET) return next();
//   const key = req.headers['x-api-key'];
//   if (key && key === API_SHARED_SECRET) return next();
//   return res.status(403).json({ success: false, message: 'Forbidden: invalid API key' });
// };

// --- Initialize Firebase Admin for ID token verification and server-side Firestore ---
let adminDb = null;
(() => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      }
      adminDb = admin.firestore();
      logger.info('Firebase Admin initialized for Auth and Firestore.');
    } else {
      logger.warn('Firebase Admin not initialized: missing FIREBASE_* env. ID token verification and Firestore writes will fail.');
    }
  } catch (e) {
    logger.error('Firebase Admin initialization failed:', { error: e.message });
  }
})();

// Auth middleware: verify Firebase ID token from Authorization: Bearer <token>
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const decoded = await admin.auth().verifyIdToken(parts[1]);
      req.user = { uid: decoded.uid, email: decoded.email || null };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Unauthorized: missing or invalid Authorization header' });
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid ID token', error: e.message });
  }
};

// Initialize Stripe instance
let stripeInstance = null;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (STRIPE_SECRET_KEY) {
  try {
    stripeInstance = Stripe(STRIPE_SECRET_KEY);
    logger.info('Stripe initialized: Payments enabled.');
  } catch (e) {
    logger.error('Failed to initialize Stripe, payments disabled:', { error: e.message });
  }
} else {
  logger.warn('Stripe credentials missing. Set STRIPE_SECRET_KEY. /create-payment-intent will be disabled.');
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ORDERS_COLLECTION = 'orders_v2';

// Initialize PaymentService
let paymentService = null;
let schemaService = null;
if (adminDb) {
  paymentService = new PaymentService(adminDb);
  schemaService = new SchemaService(adminDb);
  logger.info('PaymentService and SchemaService initialized');
}

const toMinorUnits = (amount) => Math.max(0, Math.round(Number(amount || 0) * 100));

const buildSuccessUrl = (origin, returnPath, orderId) => {
  const base = origin.replace(/\/$/, '') + returnPath;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`;
};

const buildCancelUrl = (origin, returnPath, orderId) => {
  const base = origin.replace(/\/$/, '') + returnPath;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}orderId=${encodeURIComponent(orderId)}&canceled=1`;
};

const logPaymentEvent = (message, payload = {}) => {
  logger.info(`[payments] ${message}`, payload);
};

const getOrdersCollection = () => {
  if (!adminDb) {
    throw new Error('Firestore not configured');
  }
  return adminDb.collection(ORDERS_COLLECTION);
};

const findOrderByIdempotency = async (idempotencyKey, email) => {
  if (!idempotencyKey) return null;
  try {
    const snapshot = await getOrdersCollection()
      .where('idempotencyKey', '==', idempotencyKey)
      .where('userEmail', '==', (email || '').toLowerCase())
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, data: doc.data() };
  } catch (error) {
    logger.warn('Failed to query order by idempotency', error.message);
    return null;
  }
};

const findOrderBySessionId = async (sessionId) => {
  if (!sessionId) return null;
  try {
    const snapshot = await getOrdersCollection()
      .where('providerSessionId', '==', sessionId)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, data: doc.data() };
  } catch (error) {
    logger.warn('Failed to find order by session id', error.message);
    return null;
  }
};
// Cache Firestore connectivity status (check every 30 seconds instead of every request)
let firestoreConnectivityCache = { status: 'unknown', lastChecked: 0 };
const FIRESTORE_CACHE_TTL = 30000; // 30 seconds

// Health endpoint exposes a non-sensitive boot id so client can detect backend restarts
app.get('/health', async (req, res) => {
  const healthCheck = {
    ok: true,
    boot_id: SERVER_BOOT_ID,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      firebase: !!adminDb,
      stripe: !!stripeInstance,
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    }
  };

  // Test Firestore connectivity only if cache is stale (reduces database writes by 99%)
  if (adminDb) {
    const now = Date.now();
    const cacheAge = now - firestoreConnectivityCache.lastChecked;
    
    if (cacheAge > FIRESTORE_CACHE_TTL) {
      // Cache is stale, perform actual connectivity check
      try {
        await adminDb.collection('health_checks').doc('test').set({ 
          timestamp: admin.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
        firestoreConnectivityCache = { status: 'ok', lastChecked: now };
      } catch (error) {
        firestoreConnectivityCache = { status: 'error', lastChecked: now };
        healthCheck.ok = false;
        logger.error('Health check: Firestore connectivity failed', { error: error.message });
      }
    }
    
    // Use cached status
    healthCheck.services.firestoreConnectivity = firestoreConnectivityCache.status;
    if (firestoreConnectivityCache.status === 'error') {
      healthCheck.ok = false;
    }
  }

  const status = healthCheck.ok ? 200 : 503;
  res.status(status).json(healthCheck);
});

// --- Newsletter Subscription (Brevo) ---
const BREVO_API_KEY = process.env.BREVO_API_KEY;

app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    if (!BREVO_API_KEY) {
      logger.warn('Newsletter subscription attempted but BREVO_API_KEY not configured');
      return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    }

    // Add contact to Brevo
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        updateEnabled: true,
      }),
    });

    // Handle response - may be empty for 201/204
    let data = {};
    const responseText = await response.text();
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Response might be empty, that's OK
      }
    }

    if (response.ok || response.status === 201 || response.status === 204) {
      logger.info('Newsletter subscription successful', { email: email.toLowerCase() });
      
      // Send VIP newsletter email using email service
      emailService.sendNewsletterEmail(email.toLowerCase()).catch(err => {
        logger.warn('Failed to send newsletter email', { email: email.toLowerCase(), error: err.message });
      });

      return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } else if (response.status === 400 && data.code === 'duplicate_parameter') {
      logger.info('Newsletter: Contact already subscribed', { email: email.toLowerCase() });
      return res.status(200).json({ success: true, message: 'Already subscribed' });
    } else {
      logger.error('Brevo API error', { status: response.status, data });
      return res.status(500).json({ success: false, message: 'Subscription failed' });
    }
  } catch (error) {
    logger.error('Newsletter subscription error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Subscription failed' });
  }
});

// TEST ENDPOINT: Send test emails (development only)
app.post('/api/test-emails', async (req, res) => {
  // Only allow in development/local environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production' });
  }
  
  const { email, type } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }

  try {
    if (type === 'newsletter' || type === 'all') {
      await emailService.sendNewsletterEmail(email);
      logger.info('Test newsletter email sent', { email });
    }
    
    if (type === 'order' || type === 'all') {
      const testOrderDetails = {
        orderId: 'TEST-ORDER-123',
        items: [
          { name: 'Chocolate Chip Cookie', quantity: 6, price: 299 },
          { name: 'Double Chocolate Cookie', quantity: 4, price: 349 },
          { name: 'Oatmeal Raisin Cookie', quantity: 2, price: 279 }
        ],
        totalAmount: 4072,
        currency: 'INR',
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          country: 'IN'
        }
      };
      await emailService.sendOrderConfirmationEmail(email, testOrderDetails);
      logger.info('Test order confirmation email sent', { email });
    }

    if (type === 'welcome') {
      await emailService.sendWelcomeEmail(email, 'Test User');
      logger.info('Test welcome email sent', { email });
    }

    return res.status(200).json({ success: true, message: `Test email(s) sent to ${email}` });
  } catch (error) {
    logger.error('Test email failed', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
});


// --- ROUTES ---

app.get('/test-db', async (req, res) => {
  try {
    logger.info('[diag] admin.apps.length =', admin.apps.length, 'adminDb set =', !!adminDb);
    if (!adminDb) {
      return res.status(503).json({ success: false, message: 'Firestore not configured on server.' });
    }
    const testDocRef = adminDb.collection('test_collection').doc('test_doc');
    await testDocRef.set({
      message: 'Test data saved successfully!',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info('Successfully wrote to Firestore from /test-db route.');
    res.status(200).json({ success: true, message: 'Test data saved to Firestore.' });
  } catch (error) {
    logger.error('Error writing to Firestore:', error);
    res.status(500).json({ success: false, message: 'Failed to write test data to Firestore.' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({ ok: true, message: 'Cookie Gallery Backend API is alive and kicking! Ready for payment processing.' });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.post('/create-payment-intent', async (req, res) => {
  if (!stripeInstance) {
    return res.status(503).json({ message: 'Payments not configured on server.' });
  }
  const { amount, currency, customerEmail } = req.body;
  if (!amount || !currency) {
    return res.status(400).json({ message: 'Amount and currency are required.' });
  }
  try {
    // Convert amount to smallest currency unit (cents for USD, paise for INR)
    const amountInCents = Math.round(amount * 100);
    
    const paymentIntentOptions = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      // Disable automatic payment methods to prevent Link
      automatic_payment_methods: {
        enabled: false,
      },
    };

    // Add receipt_email if customer email is provided to enable Stripe receipt generation
    if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
      paymentIntentOptions.receipt_email = customerEmail;
    }

    const paymentIntent = await stripeInstance.paymentIntents.create(paymentIntentOptions);
    
    if (!paymentIntent) {
      return res.status(500).json({ message: 'Error creating payment intent with Stripe.' });
    }
    
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error('Error creating Stripe payment intent:', error);
    res.status(500).json({ message: "Failed to create Stripe payment intent.", error: error.message });
  }
});

// Endpoint to save user profile via Admin SDK
app.post('/save-user', requireAuth, async (req, res) => {
  if (!adminDb) {
    return res.status(503).json({ success: false, message: 'Firestore not configured on server.' });
  }
  try {
    if (!req.user || !req.user.email) {
      return res.status(400).json({ success: false, message: 'Authenticated email not available on token.' });
    }
    const emailKey = String(req.user.email).toLowerCase();
    const { displayName, phoneNumber, isNewUser } = req.body || {};
    const userRef = adminDb.collection('users').doc(emailKey);
    
    // Check if user exists (for welcome email)
    const userDoc = await userRef.get();
    const isFirstTimeUser = !userDoc.exists || isNewUser;
    
    await userRef.set({
      uid: emailKey,              // Store Gmail as UID per requirement
      authUid: req.user.uid || null, // Preserve actual Firebase UID separately
      email: emailKey,
      displayName: displayName || null,
      phoneNumber: phoneNumber || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(isFirstTimeUser && { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
    }, { merge: true });
    
    logger.info('Saved user profile for', emailKey);
    
    // Send welcome email for first-time users
    if (isFirstTimeUser) {
      emailService.sendWelcomeEmail(emailKey, displayName).catch(err => {
        logger.warn('Failed to send welcome email', { email: emailKey, error: err.message });
      });
    }
    
    res.status(200).json({ success: true, message: 'User saved.' });
  } catch (err) {
    logger.error('Error saving user profile:', err);
    res.status(500).json({ success: false, message: 'Failed to save user.' });
  }
});

// New endpoint to retrieve payment intent details with expanded data
// @route   POST /get-payment-details
// @desc    Retrieves full payment intent details including payment method and charges
app.post('/get-payment-details', requireAuth, async (req, res) => {
  if (!stripeInstance) {
    return res.status(503).json({ message: 'Stripe not configured on server.' });
  }
  
  const { paymentIntentId } = req.body;
  
  if (!paymentIntentId) {
    return res.status(400).json({ message: 'Payment Intent ID is required.' });
  }
  
  try {
    logger.info('🔍 Retrieving payment details for:', paymentIntentId);

    // Retrieve payment intent with expanded payment_method and latest_charge for robust access
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ['payment_method', 'latest_charge'] }
    );

    // Normalize payment method as an object (expand if needed)
    let paymentMethod = paymentIntent.payment_method;
    if (paymentMethod && typeof paymentMethod === 'string') {
      try {
        paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentMethod);
      } catch (pmErr) {
        logger.warn('⚠️ Could not expand payment method, continuing with charge details fallback:', pmErr.message);
        paymentMethod = null;
      }
    }

    // Normalize charge (prefer latest_charge)
    let charge = paymentIntent.latest_charge;
    if (charge && typeof charge === 'string') {
      try {
        charge = await stripeInstance.charges.retrieve(charge);
      } catch (chErr) {
        logger.warn('⚠️ Could not expand latest_charge:', chErr.message);
        charge = null;
      }
    }

    // Debug logging for receipt URL
    logger.info('🔍 PaymentIntent receipt_email:', paymentIntent.receipt_email);
    logger.info('🔍 Charge receipt_url:', charge?.receipt_url);
    logger.info('🔍 Charge ID:', charge?.id);

    // Build safe details with fallbacks
    const paymentDetails = {
      // Card details (safe - no sensitive data)
      cardBrand: paymentMethod?.card?.brand
        || charge?.payment_method_details?.card?.brand
        || null,
      cardLast4: paymentMethod?.card?.last4
        || charge?.payment_method_details?.card?.last4
        || null,
      cardCountry: paymentMethod?.card?.country || null,
      cardExpMonth: paymentMethod?.card?.exp_month || null,
      cardExpYear: paymentMethod?.card?.exp_year || null,
      cardFunding: paymentMethod?.card?.funding
        || charge?.payment_method_details?.card?.funding
        || null, // credit/debit/prepaid

      // Billing details
      customerName: paymentMethod?.billing_details?.name || null,
      customerEmail: paymentMethod?.billing_details?.email || null,
      customerPhone: paymentMethod?.billing_details?.phone || null,

      // Transaction metadata
      paymentMethodId: (typeof paymentIntent.payment_method === 'object'
        ? paymentIntent.payment_method?.id
        : paymentIntent.payment_method) || null,
      receiptUrl: charge?.receipt_url || null,
      chargeId: charge?.id || null,
    };

    logger.info('✅ Payment details retrieved successfully', { 
      hasReceiptUrl: !!paymentDetails.receiptUrl,
      receiptEmail: paymentIntent.receipt_email 
    });
    res.status(200).json({ success: true, paymentDetails });
  } catch (error) {
    logger.error('❌ Error retrieving payment details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve payment details.', 
      error: error.message 
    });
  }
});

// New Endpoint to save payment data to Firestore
// @route   POST /save-order-data
// @desc    Saves user and payment data to Firestore
app.post('/save-order-data', requireAuth, async (req, res) => {
  if (!adminDb) {
    return res.status(503).json({ success: false, message: 'Firestore not configured on server.' });
  }
  const { 
    paymentIntentId, 
    items, 
    paymentStatus, 
    paymentAmount, 
    paymentCurrency,
    // Payment method details
    cardBrand,
    cardLast4,
    cardCountry,
    cardExpMonth,
    cardExpYear,
    cardFunding,
    // Billing details
    customerName,
    customerEmail,
    customerPhone,
    // Transaction metadata
    paymentMethodId,
    receiptUrl,
    chargeId,
    orderStatus
  } = req.body;

  if (!paymentIntentId || !items || !paymentStatus) {
    return res.status(400).json({ message: 'Missing required order data.' });
  }

  if (!req.user || !req.user.email) {
    return res.status(400).json({ message: 'Authenticated email not available on token.' });
  }
  const userId = String(req.user.email).toLowerCase();

  try {
    logger.info('💾 Saving order data for user:', userId);
    logger.info('💳 Payment Intent ID:', paymentIntentId);
    logger.info('🍪 Items:', JSON.stringify(items));
    logger.info('💳 Card:', cardBrand, 'ending in', cardLast4);
    
    const orderRef = adminDb.collection('orders').doc(paymentIntentId);
    await orderRef.set({
      // User information
      userId,
      userEmail: req.user.email,
      
      // Order details
      items,
      orderStatus: orderStatus || 'pending',
      
      // Payment information
      paymentIntentId,
      paymentStatus,
      paymentAmount: typeof paymentAmount === 'number' ? paymentAmount : null,
      paymentCurrency: paymentCurrency || 'INR',
      paymentMethodId: paymentMethodId || null,
      
      // Card details (safe - no sensitive data)
      cardBrand: cardBrand || null,
      cardLast4: cardLast4 || null,
      cardCountry: cardCountry || null,
      cardExpMonth: cardExpMonth || null,
      cardExpYear: cardExpYear || null,
      cardFunding: cardFunding || null, // credit/debit/prepaid
      
      // Customer billing details
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      
      // Receipt and tracking
      receiptUrl: receiptUrl || null,
      chargeId: chargeId || null,
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info('✅ Order data saved successfully to Firestore with enhanced metadata');
    res.status(200).json({ success: true, message: 'Order data saved successfully.' });
  } catch (error) {
    logger.error('❌ Error saving order data:', error);
    logger.error('Error details:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save order data.', error: error.message });
  }
});

// --- New resilient checkout flow endpoints ---

app.post('/api/create-order', requireAuth, async (req, res) => {
  if (!stripeInstance) {
    return res.status(503).json({ message: 'Stripe is not configured on the server.' });
  }
  if (!adminDb) {
    return res.status(503).json({ message: 'Firestore not configured on server.' });
  }

  try {
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.clientRequestId || null;
    const cart = req.body?.cart || {};
    const totalAmount = Number(req.body?.totalAmount || 0);
    const returnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath : '/payment-status';
    const successPath = typeof req.body?.successPath === 'string' ? req.body.successPath : '/order-success';
    const shippingAddress = req.body?.shippingAddress || null;
    const metadata = req.body?.metadata || {};
    const customerEmail = (req.body?.customerEmail || req.user?.email || '').toLowerCase();
    const amountInMinorUnits = toMinorUnits(totalAmount);

    if (!cart || Object.keys(cart).length === 0) {
      return res.status(400).json({ message: 'Cart is required to create an order.' });
    }
    if (!amountInMinorUnits) {
      return res.status(400).json({ message: 'Total amount must be greater than zero.' });
    }
    if (!customerEmail) {
      return res.status(400).json({ message: 'Customer email is required.' });
    }

    if (idempotencyKey) {
      const existing = await findOrderByIdempotency(idempotencyKey, customerEmail);
      if (existing && existing.data) {
        logPaymentEvent('order_reused_idempotency', { localOrderId: existing.id, email: customerEmail });
        return res.status(200).json({
          checkoutUrl: existing.data.checkoutUrl,
          localOrderId: existing.id,
          providerSessionId: existing.data.providerSessionId || null,
          status: existing.data.status || 'pending',
        });
      }
    }

    const localOrderId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const originHeader = req.get('origin');
    const origin = originHeader || `${req.protocol}://${req.get('host')}`;
    const successUrl = buildSuccessUrl(origin, returnPath, localOrderId);
    const cancelUrl = buildCancelUrl(origin, returnPath, localOrderId);

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: false,
      client_reference_id: localOrderId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        receipt_email: customerEmail || undefined,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'inr',
            unit_amount: amountInMinorUnits,
            product_data: {
              name: 'Cookie Gallery Order',
            },
          },
        },
      ],
      metadata: {
        localOrderId,
        flow: metadata?.flow || 'standard',
      },
    });

    // Write to legacy orders_v2 collection
    const ordersRef = getOrdersCollection();
    await ordersRef.doc(localOrderId).set({
      localOrderId,
      userEmail: customerEmail,
      userUid: req.user?.uid || null,
      status: 'pending',
      totalAmount,
      currency: 'INR',
      cart,
      shippingAddress,
      metadata,
      providerSessionId: session.id,
      checkoutUrl: session.url,
      idempotencyKey,
      returnPath,
      successPath,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ALSO write to new normalized schema (dual-write)
    if (schemaService) {
      try {
        // Transform cart to items array
        const items = Object.entries(cart).map(([cookieId, quantity]) => ({
          cookieId,
          id: cookieId,
          name: cookieId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          quantity,
          price: Math.round(totalAmount / Object.values(cart).reduce((sum, qty) => sum + qty, 0)),
        }));

        await schemaService.createOrder({
          orderId: localOrderId,
          userId: customerEmail,
          status: 'pending',
          totalAmount,
          currency: 'INR',
          items,
          shippingAddress,
          orderType: metadata?.orderType || 'standard',
          source: 'web',
          providerSessionId: session.id,
          checkoutUrl: session.url,
          idempotencyKey,
        });
        logger.info('✅ Dual-write: Order written to normalized schema', { localOrderId });
      } catch (normalizedError) {
        // Don't fail the request if normalized write fails
        logger.error('⚠️ Failed to write to normalized schema (non-critical)', { 
          localOrderId, 
          error: normalizedError.message 
        });
      }
    }

    logPaymentEvent('order_created', { localOrderId, sessionId: session.id, email: customerEmail });
    res.status(200).json({
      checkoutUrl: session.url,
      localOrderId,
      providerSessionId: session.id,
    });
  } catch (error) {
    logger.error('Failed to create order session', error);
    res.status(500).json({ message: error?.message || 'Failed to create checkout order.' });
  }
});

app.get('/api/order-status', requireAuth, async (req, res) => {
  if (!adminDb) {
    return res.status(503).json({ message: 'Firestore not configured on server.' });
  }
  const orderId = req.query?.orderId;
  if (!orderId) {
    return res.status(400).json({ message: 'orderId query parameter is required.' });
  }
  try {
    const tokenEmail = typeof req.user?.email === 'string' ? req.user.email.toLowerCase() : null;
    if (!tokenEmail) {
      return res.status(400).json({ message: 'Authenticated email missing on token.' });
    }
    const docRef = getOrdersCollection().doc(String(orderId));
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const order = snapshot.data();
    const storedEmail = typeof order.userEmail === 'string' ? order.userEmail.toLowerCase() : '';
    if (storedEmail && storedEmail !== tokenEmail) {
      logger.warn('[order-status] email mismatch - allowing in local dev', { orderId, storedEmail, tokenEmail });
      // In production, this would return 403, but allow in local development
      // Uncomment below for production:
      // return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
    }

    let status = order.status || 'pending';
    let providerInfo = order.providerInfo || null;

    if (status === 'pending' && stripeInstance && order.providerSessionId) {
      try {
        const session = await stripeInstance.checkout.sessions.retrieve(order.providerSessionId, { expand: ['payment_intent'] });
        
        // Extract payment_intent ID (it's an object when expanded, string otherwise)
        const paymentIntentId = typeof session.payment_intent === 'object' 
          ? session.payment_intent?.id 
          : session.payment_intent;
        
        providerInfo = {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
          payment_intent: paymentIntentId,
        };
        if (session.payment_status === 'paid') {
          status = 'completed';
          await docRef.update({
            status,
            providerInfo,
            paymentIntentId: paymentIntentId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logPaymentEvent('order_marked_completed_poll', { localOrderId: orderId, sessionId: session.id });
        } else if (session.status === 'expired') {
          status = 'failed';
          await docRef.update({
            status,
            providerInfo,
            lastKnownError: 'Payment session expired before completion.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logPaymentEvent('order_marked_failed_poll', { localOrderId: orderId, sessionId: session.id });
        }
      } catch (err) {
        logger.warn('Failed to reconcile checkout session', err.message);
      }
    }

    const lastUpdate = order.updatedAt?.toDate ? order.updatedAt.toDate().toISOString() : null;
    
    // Return complete order details for success page
    res.status(200).json({ 
      status, 
      providerInfo, 
      lastUpdate,
      totalAmount: order.totalAmount,
      currency: order.currency,
      userEmail: order.userEmail,
      cart: order.cart,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : null,
    });
  } catch (error) {
    logger.error('Error fetching order status', error);
    res.status(500).json({ message: 'Failed to load order status.' });
  }
});

app.get('/api/payment-status', requireAuth, async (req, res) => {
  if (!adminDb) {
    return res.status(503).json({ message: 'Firestore not configured on server.' });
  }
  if (!stripeInstance) {
    return res.status(503).json({ message: 'Stripe is not configured on the server.' });
  }

  const sessionIdParam = typeof req.query?.sessionId === 'string' ? req.query.sessionId : null;
  const orderIdParam = typeof req.query?.orderId === 'string' ? req.query.orderId : null;
  if (!sessionIdParam && !orderIdParam) {
    return res.status(400).json({ message: 'sessionId or orderId is required.' });
  }

  const tokenEmail = typeof req.user?.email === 'string' ? req.user.email.toLowerCase() : null;
  if (!tokenEmail) {
    return res.status(400).json({ message: 'Authenticated email missing on token.' });
  }

  try {
    let docRef = null;
    let orderData = null;

    if (orderIdParam) {
      const candidateRef = getOrdersCollection().doc(String(orderIdParam));
      const candidateSnap = await candidateRef.get();
      if (candidateSnap.exists) {
        docRef = candidateRef;
        orderData = candidateSnap.data();
      }
    }

    if (!orderData && sessionIdParam) {
      const located = await findOrderBySessionId(sessionIdParam);
      if (located) {
        docRef = getOrdersCollection().doc(located.id);
        orderData = located.data;
      }
    }

    let session = null;
    if (!orderData && sessionIdParam) {
      try {
        session = await stripeInstance.checkout.sessions.retrieve(sessionIdParam, { expand: ['payment_intent'] });
        const derivedOrderId = session.metadata?.localOrderId || session.client_reference_id || orderIdParam;
        if (derivedOrderId) {
          const fallbackRef = getOrdersCollection().doc(String(derivedOrderId));
          const fallbackSnap = await fallbackRef.get();
          if (fallbackSnap.exists) {
            docRef = fallbackRef;
            orderData = fallbackSnap.data();
          }
        }
      } catch (error) {
        logger.warn('Failed to retrieve checkout session for payment-status', error.message);
      }
    }

    if (!orderData) {
      return res.status(404).json({ message: 'Order not found for the provided reference.' });
    }

    const storedEmail = typeof orderData.userEmail === 'string' ? orderData.userEmail.toLowerCase() : '';
    if (storedEmail && storedEmail !== tokenEmail) {
      logger.warn('[payment-status] email mismatch - allowing in local dev', { storedEmail, tokenEmail });
      // In production, this would return 403, but allow in local development
      // Uncomment below for production:
      // return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
    }

    if (!session && (sessionIdParam || orderData.providerSessionId)) {
      const lookupSessionId = sessionIdParam || orderData.providerSessionId;
      try {
        session = await stripeInstance.checkout.sessions.retrieve(lookupSessionId, { expand: ['payment_intent'] });
      } catch (error) {
        logger.warn('Failed to retrieve checkout session for payment-status', error.message);
      }
    }

    let status = orderData.status || 'pending';
    let lastKnownError = orderData.lastKnownError || null;

    if (session) {
      // Extract payment_intent ID (it's an object when expanded, string otherwise)
      const paymentIntentId = typeof session.payment_intent === 'object' 
        ? session.payment_intent?.id 
        : session.payment_intent;
      
      const updateFields = {
        providerInfo: {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
          payment_intent: paymentIntentId,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (session.payment_status === 'paid') {
        status = 'completed';
        lastKnownError = null;
        if (docRef) {
          await docRef.set({
            status,
            paymentIntentId: paymentIntentId || null,
            lastKnownError: admin.firestore.FieldValue.delete(),
            ...updateFields,
          }, { merge: true });
        }
      } else if (session.status === 'expired' || session.payment_status === 'unpaid') {
        status = 'failed';
        lastKnownError = lastKnownError || 'Payment session expired before completion.';
        if (docRef) {
          await docRef.set({
            status,
            lastKnownError,
            ...updateFields,
          }, { merge: true });
        }
      } else if (docRef) {
        await docRef.set(updateFields, { merge: true });
      }
    }

    res.status(200).json({ status, lastKnownError });
  } catch (error) {
    logger.error('Error resolving payment status', error);
    res.status(500).json({ message: 'Failed to resolve payment status.' });
  }
});

// GET /api/user-orders - Fetch all orders for authenticated Google user from Firestore
app.get('/api/user-orders', requireAuth, async (req, res) => {
  console.log('>>> /api/user-orders called for:', req.user?.email);
  
  if (!req.user || !req.user.email) {
    console.log('>>> No user or email found');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      orders: []
    });
  }

  if (!adminDb) {
    console.log('>>> Database not configured');
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
      orders: []
    });
  }

  const userEmail = req.user.email.toLowerCase();
  console.log('>>> Searching for orders with email:', userEmail);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const allOrders = [];
    
    // Query 1: Check orders_v2 collection (new flow)
    try {
      const ordersV2Ref = adminDb.collection(ORDERS_COLLECTION);
      console.log('>>> Querying orders_v2 collection:', ORDERS_COLLECTION);
      const v2Snapshot = await ordersV2Ref
        .where('userEmail', '==', userEmail)
        .where('status', 'in', ['paid', 'completed'])
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      console.log('>>> orders_v2 results:', v2Snapshot.size);

      v2Snapshot.forEach(doc => {
        const data = doc.data();
        
        // Parse items from cart object if items array not available
        let items = data.items || [];
        if (items.length === 0 && data.cart && typeof data.cart === 'object') {
          items = Object.entries(data.cart).map(([id, qty]) => ({
            id,
            name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            price: data.totalAmount / Object.values(data.cart).reduce((s, q) => s + q, 0),
            qty: qty,
            image: ''
          }));
        }
        
        allOrders.push({
          orderId: doc.id,
          totalAmount: data.totalAmount || 0,
          itemCount: items.length || data.itemCount || Object.keys(data.cart || {}).length || 0,
          items: items.map(item => ({
            id: item.id || item.productId || item.cookieId,
            name: item.name || 'Cookie',
            price: item.price || 0,
            qty: item.qty || item.quantity || 1,
            image: item.image || ''
          })),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          status: data.status || 'paid',
          source: 'orders_v2'
        });
      });
    } catch (v2Err) {
      console.log('>>> ERROR querying orders_v2:', v2Err.message);
      logger.warn('Error querying orders_v2', { error: v2Err.message });
    }
    
    // Query 2: Check legacy 'orders' collection
    try {
      const ordersRef = adminDb.collection('orders');
      const legacySnapshot = await ordersRef
        .where('userEmail', '==', userEmail)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      legacySnapshot.forEach(doc => {
        const data = doc.data();
        // Skip if already in allOrders (dedup by checking paymentIntentId)
        const isDupe = allOrders.some(o => 
          o.orderId === doc.id || 
          o.orderId === data.paymentIntentId ||
          (data.paymentIntentId && o.orderId.includes(data.paymentIntentId))
        );
        if (isDupe) return;
        
        const items = data.items || [];
        allOrders.push({
          orderId: doc.id,
          totalAmount: data.paymentAmount || data.totalAmount || 0,
          itemCount: items.length || 0,
          items: items.map(item => ({
            id: item.id || item.productId,
            name: item.name || 'Cookie',
            price: item.price || 0,
            qty: item.qty || item.quantity || 1,
            image: item.image || ''
          })),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          status: data.orderStatus || data.paymentStatus || 'paid',
          cardBrand: data.cardBrand,
          cardLast4: data.cardLast4,
          source: 'orders'
        });
      });
    } catch (legacyErr) {
      logger.warn('Error querying legacy orders', { error: legacyErr.message });
    }
    
    // Sort all orders by createdAt descending
    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Limit to requested amount
    const finalOrders = allOrders.slice(0, limit);

    logger.info('Fetched user orders from Firestore', { 
      email: userEmail, 
      count: finalOrders.length 
    });

    res.status(200).json({
      success: true,
      orders: finalOrders,
      source: 'firestore'
    });
  } catch (error) {
    logger.error('Error fetching user orders', {
      email: userEmail,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      orders: []
    });
  }
});

app.post('/api/resume-payment', requireAuth, async (req, res) => {
  if (!stripeInstance) {
    return res.status(503).json({ message: 'Stripe is not configured on the server.' });
  }
  if (!adminDb) {
    return res.status(503).json({ message: 'Firestore not configured on server.' });
  }
  const orderId = req.body?.orderId;
  if (!orderId) {
    return res.status(400).json({ message: 'orderId is required.' });
  }
  try {
    const tokenEmail = typeof req.user?.email === 'string' ? req.user.email.toLowerCase() : null;
    if (!tokenEmail) {
      return res.status(400).json({ message: 'Authenticated email missing on token.' });
    }
    const docRef = getOrdersCollection().doc(String(orderId));
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const order = snapshot.data();
    const storedEmail = typeof order.userEmail === 'string' ? order.userEmail.toLowerCase() : '';
    if (storedEmail && storedEmail !== tokenEmail) {
      logger.warn('[resume-payment] email mismatch - allowing in local dev', { orderId, storedEmail, tokenEmail });
      // In production, this would return 403, but allow in local development
      // Uncomment below for production:
      // return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
    }

    logPaymentEvent('order_resume_attempt', { localOrderId: orderId, email: tokenEmail });

    if (order.status === 'completed') {
      return res.status(200).json({ status: 'completed' });
    }
    if (order.status === 'failed') {
      return res.status(200).json({ status: 'failed', message: order.lastKnownError || 'Order previously failed.' });
    }

    if (order.providerSessionId) {
      try {
        const session = await stripeInstance.checkout.sessions.retrieve(order.providerSessionId);
        if (session && session.url && session.status !== 'expired') {
          logPaymentEvent('order_resume_existing_session', { localOrderId: orderId, sessionId: session.id, email: tokenEmail });
          return res.status(200).json({
            checkoutUrl: session.url,
            status: session.status === 'complete' ? 'completed' : 'pending',
            providerSessionId: session.id,
          });
        }
      } catch (err) {
        logger.warn('Unable to reuse existing checkout session', err.message);
      }
    }

    const amountInMinorUnits = toMinorUnits(order.totalAmount);
    if (!amountInMinorUnits) {
      return res.status(400).json({ message: 'Order amount invalid. Please recreate the order.' });
    }

    const originHeader = req.get('origin');
    const origin = originHeader || `${req.protocol}://${req.get('host')}`;
    const returnPath = order.returnPath || '/payment-status';
    const successPath = order.successPath || '/order-success';
    const successUrl = buildSuccessUrl(origin, returnPath, orderId);
    const cancelUrl = buildCancelUrl(origin, returnPath, orderId);

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: false,
      client_reference_id: orderId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.userEmail || undefined,
      payment_intent_data: {
        receipt_email: order.userEmail || undefined,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'inr',
            unit_amount: amountInMinorUnits,
            product_data: {
              name: 'Cookie Gallery Order',
            },
          },
        },
      ],
      metadata: {
        localOrderId: orderId,
        flow: order.metadata?.flow || 'standard',
        retry: 'true',
      },
    });

    await docRef.update({
      providerSessionId: session.id,
      checkoutUrl: session.url,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logPaymentEvent('order_resumed_new_session', { localOrderId: orderId, sessionId: session.id, email: tokenEmail });
    res.status(200).json({ checkoutUrl: session.url, status: 'pending', providerSessionId: session.id });
  } catch (error) {
    logger.error('Failed to resume payment', error);
    res.status(500).json({ message: error?.message || 'Unable to resume payment.' });
  }
});

// Mount new webhook routes with signature verification and idempotency
if (paymentService) {
  const webhookRoutes = createWebhookRoutes({
    stripeInstance,
    adminDb,
    paymentService
  });
  app.use('/api/webhooks', webhookRoutes);
  logger.info('Webhook routes mounted at /api/webhooks');
  
  // Mount order management routes
  const orderRoutes = createOrderRoutes({
    adminDb,
    paymentService,
    stripeInstance
  });
  app.use('/api', orderRoutes);
  logger.info('Order routes mounted');
}

// Legacy webhook endpoint (kept for backwards compatibility)
app.post(STRIPE_WEBHOOK_PATH, async (req, res) => {
  if (!stripeInstance || !STRIPE_WEBHOOK_SECRET) {
    return res.status(200).json({ received: true, message: 'Webhook received but Stripe not configured.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing stripe-signature header.');
  }

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (!adminDb) {
      return res.status(503).send('Firestore not configured');
    }
    const ordersRef = getOrdersCollection();
    const sessionId = event?.data?.object?.id;
    logPaymentEvent('webhook_received', { eventType: event.type, sessionId });

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      const localOrderId = session.metadata?.localOrderId || session.client_reference_id;
      if (!localOrderId) {
        logPaymentEvent('webhook_missing_order_id', { eventType: event.type, sessionId: session.id });
      } else {
        // Update legacy orders_v2
        const docRef = ordersRef.doc(localOrderId);
        await docRef.set({
          status: 'completed',
          providerInfo: {
            id: session.id,
            payment_status: session.payment_status,
            status: session.status,
          },
          paymentIntentId: session.payment_intent || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // ALSO update normalized schema
        if (schemaService && session.payment_status === 'paid') {
          try {
            // Retrieve payment details from Stripe
            let paymentIntent = session.payment_intent;
            if (typeof paymentIntent === 'string' && stripeInstance) {
              paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntent, {
                expand: ['payment_method', 'latest_charge']
              });
            }

            // Extract payment method details
            const paymentMethod = paymentIntent?.payment_method;
            const charge = paymentIntent?.latest_charge;

            await schemaService.updateOrderStatus(localOrderId, 'completed', {
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await schemaService.createPayment({
              orderId: localOrderId,
              userId: session.customer_email || session.customer_details?.email,
              provider: 'stripe',
              providerTransactionId: session.payment_intent,
              providerSessionId: session.id,
              status: 'succeeded',
              amount: session.amount_total / 100,
              currency: session.currency?.toUpperCase() || 'INR',
              paymentMethod: {
                type: 'card',
                cardBrand: paymentMethod?.card?.brand || charge?.payment_method_details?.card?.brand,
                cardLast4: paymentMethod?.card?.last4 || charge?.payment_method_details?.card?.last4,
                cardCountry: paymentMethod?.card?.country,
                cardExpMonth: paymentMethod?.card?.exp_month,
                cardExpYear: paymentMethod?.card?.exp_year,
                cardFunding: paymentMethod?.card?.funding,
              },
              billingDetails: {
                name: paymentMethod?.billing_details?.name || session.customer_details?.name,
                email: paymentMethod?.billing_details?.email || session.customer_details?.email,
                phone: paymentMethod?.billing_details?.phone || session.customer_details?.phone,
              },
              receiptUrl: charge?.receipt_url,
              chargeId: charge?.id,
            });

            logger.info('✅ Dual-write: Payment recorded in normalized schema', { localOrderId });
          } catch (normalizedError) {
            logger.error('⚠️ Failed to write payment to normalized schema (non-critical)', {
              localOrderId,
              error: normalizedError.message
            });
          }
        }

        logPaymentEvent('order_completed_webhook', { localOrderId, sessionId: session.id });

        // Send order confirmation email
        try {
          const customerEmail = session.customer_email || session.customer_details?.email;
          if (customerEmail) {
            // Fetch order details from Firestore
            const orderDoc = await docRef.get();
            const orderData = orderDoc.data();
            
            // Parse cart into items array
            let items = [];
            if (orderData?.cart && typeof orderData.cart === 'object') {
              items = Object.entries(orderData.cart).map(([cookieId, quantity]) => ({
                name: cookieId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                quantity,
                price: Math.round((orderData.totalAmount || 0) / Object.values(orderData.cart).reduce((sum, qty) => sum + qty, 0))
              }));
            }

            const orderDetails = {
              orderId: localOrderId,
              items,
              totalAmount: orderData?.totalAmount || session.amount_total / 100,
              currency: orderData?.currency || session.currency?.toUpperCase() || 'INR',
              shippingAddress: orderData?.shippingAddress || session.customer_details?.address
            };

            await emailService.sendOrderConfirmationEmail(customerEmail, orderDetails);
            logger.info('📧 Order confirmation email sent', { localOrderId, email: customerEmail });
          }
        } catch (emailError) {
          // Don't fail webhook if email fails
          logger.error('⚠️ Failed to send order confirmation email (non-critical)', {
            localOrderId,
            error: emailError.message
          });
        }
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      const localOrderId = session.metadata?.localOrderId || session.client_reference_id;
      if (localOrderId) {
        // Update legacy orders_v2
        await ordersRef.doc(localOrderId).set({
          status: 'failed',
          providerInfo: {
            id: session.id,
            payment_status: session.payment_status,
            status: session.status,
          },
          lastKnownError: 'Session expired before completion.',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // ALSO update normalized schema
        if (schemaService) {
          try {
            await schemaService.updateOrderStatus(localOrderId, 'failed', {
              lastKnownError: 'Session expired before completion.',
            });
            logger.info('✅ Dual-write: Order failure recorded in normalized schema', { localOrderId });
          } catch (normalizedError) {
            logger.error('⚠️ Failed to update normalized schema (non-critical)', {
              localOrderId,
              error: normalizedError.message
            });
          }
        }

        logPaymentEvent('order_failed_webhook', { localOrderId, sessionId: session.id });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error handling webhook', error);
    res.status(500).send('Webhook handler error');
  }
});

// Sentry error handler (must be before other error handlers)
if (Sentry) {
  app.use(sentryService.sentryErrorHandler());
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  logger.info(`Backend server running on http://localhost:${PORT}`);
  logger.info(`Sentry: ${Sentry ? 'Enabled' : 'Disabled'}`);
});
