
// server.js

const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const admin = require('firebase-admin');

// Load env (supports multiline private key with \n)
// 1) Root .env
require('dotenv').config();
// 2) Backend-local .env (src/backend/.env) as fallback without overriding existing vars
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: false });

const app = express();
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
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN,
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
      console.log('Firebase Admin initialized for Auth and Firestore.');
    } else {
      console.warn('Firebase Admin not initialized: missing FIREBASE_* env. ID token verification and Firestore writes will fail.');
    }
  } catch (e) {
    console.warn('Firebase Admin initialization failed:', e.message);
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
    console.log('Stripe initialized: Payments enabled.');
  } catch (e) {
    console.warn('Failed to initialize Stripe, payments disabled:', e.message);
  }
} else {
  console.warn('Stripe credentials missing. Set STRIPE_SECRET_KEY. /create-payment-intent will be disabled.');
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ORDERS_COLLECTION = 'orders_v2';

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
  const meta = {
    timestamp: new Date().toISOString(),
    ...payload,
  };
  console.log(`[payments] ${message}`, JSON.stringify(meta));
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
    console.warn('Failed to query order by idempotency', error.message);
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
    console.warn('Failed to find order by session id', error.message);
    return null;
  }
};
// Health endpoint exposes a non-sensitive boot id so client can detect backend restarts
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, boot_id: SERVER_BOOT_ID });
});


// --- ROUTES ---

app.get('/test-db', async (req, res) => {
  try {
    console.log('[diag] admin.apps.length =', admin.apps.length, 'adminDb set =', !!adminDb);
    if (!adminDb) {
      return res.status(503).json({ success: false, message: 'Firestore not configured on server.' });
    }
    const testDocRef = adminDb.collection('test_collection').doc('test_doc');
    await testDocRef.set({
      message: 'Test data saved successfully!',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Successfully wrote to Firestore from /test-db route.');
    res.status(200).json({ success: true, message: 'Test data saved to Firestore.' });
  } catch (error) {
    console.error('Error writing to Firestore:', error);
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
  const { amount, currency } = req.body;
  if (!amount || !currency) {
    return res.status(400).json({ message: 'Amount and currency are required.' });
  }
  try {
    // Convert amount to smallest currency unit (cents for USD, paise for INR)
    const amountInCents = Math.round(amount * 100);
    
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      // Disable automatic payment methods to prevent Link
      automatic_payment_methods: {
        enabled: false,
      },
    });
    
    if (!paymentIntent) {
      return res.status(500).json({ message: 'Error creating payment intent with Stripe.' });
    }
    
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
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
    const { displayName, phoneNumber } = req.body || {};
    const userRef = adminDb.collection('users').doc(emailKey);
    await userRef.set({
      uid: emailKey,              // Store Gmail as UID per requirement
      authUid: req.user.uid || null, // Preserve actual Firebase UID separately
      email: emailKey,
      displayName: displayName || null,
      phoneNumber: phoneNumber || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('Saved user profile for', emailKey);
    res.status(200).json({ success: true, message: 'User saved.' });
  } catch (err) {
    console.error('Error saving user profile:', err);
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
    console.log('🔍 Retrieving payment details for:', paymentIntentId);

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
        console.warn('⚠️ Could not expand payment method, continuing with charge details fallback:', pmErr.message);
        paymentMethod = null;
      }
    }

    // Normalize charge (prefer latest_charge)
    let charge = paymentIntent.latest_charge;
    if (charge && typeof charge === 'string') {
      try {
        charge = await stripeInstance.charges.retrieve(charge);
      } catch (chErr) {
        console.warn('⚠️ Could not expand latest_charge:', chErr.message);
        charge = null;
      }
    }

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

    console.log('✅ Payment details retrieved successfully');
    res.status(200).json({ success: true, paymentDetails });
  } catch (error) {
    console.error('❌ Error retrieving payment details:', error);
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
    console.log('💾 Saving order data for user:', userId);
    console.log('💳 Payment Intent ID:', paymentIntentId);
    console.log('🍪 Items:', JSON.stringify(items));
    console.log('💳 Card:', cardBrand, 'ending in', cardLast4);
    
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
    
    console.log('✅ Order data saved successfully to Firestore with enhanced metadata');
    res.status(200).json({ success: true, message: 'Order data saved successfully.' });
  } catch (error) {
    console.error('❌ Error saving order data:', error);
    console.error('Error details:', error.message);
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

    logPaymentEvent('order_created', { localOrderId, sessionId: session.id, email: customerEmail });
    res.status(200).json({
      checkoutUrl: session.url,
      localOrderId,
      providerSessionId: session.id,
    });
  } catch (error) {
    console.error('Failed to create order session', error);
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
      console.warn('[order-status] email mismatch', { orderId, storedEmail, tokenEmail });
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
      }
    }

    let status = order.status || 'pending';
    let providerInfo = order.providerInfo || null;

    if (status === 'pending' && stripeInstance && order.providerSessionId) {
      try {
        const session = await stripeInstance.checkout.sessions.retrieve(order.providerSessionId, { expand: ['payment_intent'] });
        providerInfo = {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
        };
        if (session.payment_status === 'paid') {
          status = 'completed';
          await docRef.update({
            status,
            providerInfo,
            paymentIntentId: session.payment_intent || null,
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
        console.warn('Failed to reconcile checkout session', err.message);
      }
    }

    const lastUpdate = order.updatedAt?.toDate ? order.updatedAt.toDate().toISOString() : null;
    res.status(200).json({ status, providerInfo, lastUpdate });
  } catch (error) {
    console.error('Error fetching order status', error);
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
        console.warn('Failed to retrieve checkout session for payment-status', error.message);
      }
    }

    if (!orderData) {
      return res.status(404).json({ message: 'Order not found for the provided reference.' });
    }

    const storedEmail = typeof orderData.userEmail === 'string' ? orderData.userEmail.toLowerCase() : '';
    if (storedEmail && storedEmail !== tokenEmail && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
    }

    if (!session && (sessionIdParam || orderData.providerSessionId)) {
      const lookupSessionId = sessionIdParam || orderData.providerSessionId;
      try {
        session = await stripeInstance.checkout.sessions.retrieve(lookupSessionId, { expand: ['payment_intent'] });
      } catch (error) {
        console.warn('Failed to retrieve checkout session for payment-status', error.message);
      }
    }

    let status = orderData.status || 'pending';
    let lastKnownError = orderData.lastKnownError || null;

    if (session) {
      const updateFields = {
        providerInfo: {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          amount_total: session.amount_total,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (session.payment_status === 'paid') {
        status = 'completed';
        lastKnownError = null;
        if (docRef) {
          await docRef.set({
            status,
            paymentIntentId: session.payment_intent || null,
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
    console.error('Error resolving payment status', error);
    res.status(500).json({ message: 'Failed to resolve payment status.' });
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
      console.warn('[resume-payment] email mismatch', { orderId, storedEmail, tokenEmail });
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Forbidden: order does not belong to the current user.' });
      }
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
        console.warn('Unable to reuse existing checkout session', err.message);
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
    console.error('Failed to resume payment', error);
    res.status(500).json({ message: error?.message || 'Unable to resume payment.' });
  }
});

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
    console.error('Webhook signature verification failed', err.message);
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
        logPaymentEvent('order_completed_webhook', { localOrderId, sessionId: session.id });
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      const localOrderId = session.metadata?.localOrderId || session.client_reference_id;
      if (localOrderId) {
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
        logPaymentEvent('order_failed_webhook', { localOrderId, sessionId: session.id });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook', error);
    res.status(500).send('Webhook handler error');
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
