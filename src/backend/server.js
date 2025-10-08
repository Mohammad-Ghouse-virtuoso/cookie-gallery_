
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
app.use(express.json());
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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  res.status(200).send('Cookie Gallery Backend API is alive and kicking! Ready for payment processing.');
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
    
    // Retrieve payment intent with expanded payment_method
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ['payment_method', 'latest_charge'] }
    );
    
    // Extract safe payment method details
    const paymentMethod = paymentIntent.payment_method;
    const charge = paymentIntent.latest_charge;
    
    const paymentDetails = {
      // Card details (safe - no sensitive data)
      cardBrand: paymentMethod?.card?.brand || null,
      cardLast4: paymentMethod?.card?.last4 || null,
      cardCountry: paymentMethod?.card?.country || null,
      cardExpMonth: paymentMethod?.card?.exp_month || null,
      cardExpYear: paymentMethod?.card?.exp_year || null,
      cardFunding: paymentMethod?.card?.funding || null, // credit/debit/prepaid
      
      // Billing details
      customerName: paymentMethod?.billing_details?.name || null,
      customerEmail: paymentMethod?.billing_details?.email || null,
      customerPhone: paymentMethod?.billing_details?.phone || null,
      
      // Transaction metadata
      paymentMethodId: paymentIntent.payment_method?.id || paymentIntent.payment_method || null,
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

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
