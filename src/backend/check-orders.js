const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

console.log('Project ID:', serviceAccount.projectId);
console.log('Client Email:', serviceAccount.clientEmail ? 'SET' : 'MISSING');

if (!serviceAccount.projectId) {
  console.log('Firebase not configured');
  process.exit(0);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function check() {
  // Check one full document from each collection
  console.log('\n=== orders collection (FULL DOCUMENT) ===');
  const s1 = await db.collection('orders').limit(1).get();
  s1.forEach(d => {
    console.log('ID:', d.id);
    console.log('All fields:', JSON.stringify(d.data(), null, 2));
  });
  
  console.log('\n=== orders_v2 collection (FULL DOCUMENT) ===');
  const s2 = await db.collection('orders_v2').limit(1).get();
  s2.forEach(d => {
    console.log('ID:', d.id);
    console.log('All fields:', JSON.stringify(d.data(), null, 2));
  });
  
  // Now check your specific email
  const yourEmail = 'shaikmohammod21@gmail.com';
  console.log('\n=== Orders for', yourEmail, '===');
  const q = await db.collection('orders_v2')
    .where('userEmail', '==', yourEmail)
    .where('status', '==', 'completed')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  console.log('Found:', q.size, 'orders');
  q.forEach(d => {
    const data = d.data();
    console.log('-', d.id, '| Total:', data.totalAmount, '| Created:', data.createdAt?._seconds);
  });
}

check()
  .then(() => process.exit(0))
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
