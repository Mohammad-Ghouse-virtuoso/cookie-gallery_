const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();

// Test emails to exclude (Mohammad's test accounts + obvious test emails)
const testEmails = [
  'shaikmohammod21@gmail.com',
  'shaikmohammod109@gmail.com',
  'shaikhmohammadhere@gmail.com',
  'supernova8363@gmail.com',
  'shaikmohammod0@gmail.com',
  'shaikmohammad109@gmail.com', // typo variant
  'test@example.com',
  'maxed@example.com',
  'myemail@example.com',
  'devdemodev55@gmail.com'  // dev test account
].map(e => e.toLowerCase());

// Test phone numbers (your testing numbers)
const testPhones = [
  '+918074158363'  // Your testing number
];

async function getUsers() {
  const usersSnapshot = await db.collection('users').get();
  
  console.log('\n=== REAL USERS (excluding test accounts) ===\n');
  
  const seenEmails = new Set();
  const realUsers = [];
  
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    const email = data.email || doc.id;
    const phone = data.phoneNumber || null;
    
    // Skip test emails
    if (testEmails.includes(email.toLowerCase())) return;
    
    // Skip test phone numbers
    if (phone && testPhones.includes(phone)) return;
    
    // Skip if it's a Firebase UID (not an email) and no phone
    if (!email.includes('@') && !phone) return;
    
    // Skip duplicates
    const key = email.toLowerCase();
    if (seenEmails.has(key)) return;
    seenEmails.add(key);
    
    realUsers.push({
      email: email.includes('@') ? email : 'N/A (phone auth)',
      displayName: data.displayName || 'N/A',
      phoneNumber: phone || 'N/A',
      createdAt: data.createdAt?.toDate?.() || data.createdAt || 'N/A'
    });
  });
  
  if (realUsers.length === 0) {
    console.log('No real users found (all users are test accounts)');
  } else {
    realUsers.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email}`);
      if (u.displayName !== 'N/A') console.log(`   Name: ${u.displayName}`);
      if (u.phoneNumber !== 'N/A') console.log(`   Phone: ${u.phoneNumber}`);
      console.log('');
    });
    console.log(`Total real users: ${realUsers.length}`);
  }
}

getUsers().catch(console.error).finally(() => process.exit(0));
