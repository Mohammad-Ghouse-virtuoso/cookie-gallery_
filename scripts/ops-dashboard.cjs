#!/usr/bin/env node
/**
 * Cookie Gallery Operations Dashboard
 * 
 * View users, orders, and analytics from Firestore via terminal.
 * 
 * Usage:
 *   node scripts/ops-dashboard.js users [today|week|month|all]
 *   node scripts/ops-dashboard.js orders [today|week|month|all]
 *   node scripts/ops-dashboard.js summary
 *   node scripts/ops-dashboard.js non-buyers [today|week]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../src/backend/.env') });

const admin = require('firebase-admin');

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase credentials in environment variables.');
    console.error('   Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }
  
  // Handle escaped newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  
  return admin.firestore();
}

// Get date range based on period
function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === 'today') {
    return { start: today, end: now, label: 'Today' };
  }
  
  if (period === 'week') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { start: weekAgo, end: now, label: 'Past 7 days' };
  }
  
  if (period === 'month') {
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return { start: monthAgo, end: now, label: 'Past 30 days' };
  }
  
  // 'all' or default
  return { start: new Date(0), end: now, label: 'All time' };
}

// Format currency
function formatPrice(amount, currency = 'INR') {
  if (typeof amount !== 'number') return '₹0.00';
  // Stripe amounts are in smallest unit (paise for INR)
  const value = amount / 100;
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: currency.toUpperCase() 
  }).format(value);
}

// Format date nicely
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', { 
    dateStyle: 'medium', 
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
}

// ========== COMMANDS ==========

async function listUsers(db, period) {
  const { start, end, label } = getDateRange(period);
  console.log(`\n👥 USERS SIGNED UP (${label})\n${'='.repeat(50)}`);
  
  let query = db.collection('users').orderBy('createdAt', 'desc');
  
  if (period !== 'all') {
    query = query.where('createdAt', '>=', start).where('createdAt', '<=', end);
  }
  
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    console.log('No users found for this period.');
    return;
  }
  
  console.log(`Found ${snapshot.size} user(s)\n`);
  
  snapshot.forEach((doc, index) => {
    const user = doc.data();
    console.log(`${index + 1}. ${user.displayName || user.email || doc.id}`);
    console.log(`   📧 Email: ${user.email || 'N/A'}`);
    console.log(`   📱 Phone: ${user.phoneNumber || 'N/A'}`);
    console.log(`   📅 Signed up: ${formatDate(user.createdAt)}`);
    console.log('');
  });
}

async function listOrders(db, period) {
  const { start, end, label } = getDateRange(period);
  console.log(`\n🛒 ORDERS (${label})\n${'='.repeat(50)}`);
  
  let query = db.collection('orders').orderBy('createdAt', 'desc');
  
  if (period !== 'all') {
    query = query.where('createdAt', '>=', start).where('createdAt', '<=', end);
  }
  
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    console.log('No orders found for this period.');
    return;
  }
  
  let totalRevenue = 0;
  const orders = [];
  
  snapshot.forEach(doc => {
    const order = doc.data();
    orders.push({ id: doc.id, ...order });
    if (order.paymentAmount && order.paymentStatus === 'succeeded') {
      totalRevenue += order.paymentAmount;
    }
  });
  
  console.log(`Found ${orders.length} order(s) | Total Revenue: ${formatPrice(totalRevenue)}\n`);
  
  orders.forEach((order, index) => {
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const itemSummary = Array.isArray(order.items) 
      ? order.items.map(i => `${i.name || i.id} x${i.qty || 1}`).join(', ')
      : 'N/A';
    
    console.log(`${index + 1}. Order #${order.id.slice(-8)}`);
    console.log(`   👤 Customer: ${order.customerName || order.userEmail || 'N/A'}`);
    console.log(`   📧 Email: ${order.userEmail || 'N/A'}`);
    console.log(`   💰 Amount: ${formatPrice(order.paymentAmount, order.paymentCurrency)}`);
    console.log(`   💳 Card: ${order.cardBrand || 'N/A'} ****${order.cardLast4 || '????'}`);
    console.log(`   📦 Items (${itemCount}): ${itemSummary.slice(0, 60)}${itemSummary.length > 60 ? '...' : ''}`);
    console.log(`   ✅ Status: ${order.paymentStatus || 'unknown'}`);
    console.log(`   📅 Date: ${formatDate(order.createdAt)}`);
    console.log('');
  });
}

async function showSummary(db) {
  console.log(`\n📊 COOKIE GALLERY DASHBOARD\n${'='.repeat(50)}`);
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  const usersToday = await db.collection('users')
    .where('createdAt', '>=', today)
    .get();
  const usersWeek = await db.collection('users')
    .where('createdAt', '>=', weekAgo)
    .get();
  
  // Get all orders
  const ordersSnapshot = await db.collection('orders').get();
  const ordersToday = await db.collection('orders')
    .where('createdAt', '>=', today)
    .get();
  const ordersWeek = await db.collection('orders')
    .where('createdAt', '>=', weekAgo)
    .get();
  
  // Calculate revenue
  let totalRevenue = 0, revenueToday = 0, revenueWeek = 0;
  
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    if (order.paymentAmount && order.paymentStatus === 'succeeded') {
      totalRevenue += order.paymentAmount;
    }
  });
  
  ordersToday.forEach(doc => {
    const order = doc.data();
    if (order.paymentAmount && order.paymentStatus === 'succeeded') {
      revenueToday += order.paymentAmount;
    }
  });
  
  ordersWeek.forEach(doc => {
    const order = doc.data();
    if (order.paymentAmount && order.paymentStatus === 'succeeded') {
      revenueWeek += order.paymentAmount;
    }
  });
  
  // Calculate average ticket
  const avgTicket = ordersSnapshot.size > 0 ? totalRevenue / ordersSnapshot.size : 0;
  
  console.log('\n👥 USERS');
  console.log(`   Total:      ${usersSnapshot.size}`);
  console.log(`   Today:      ${usersToday.size}`);
  console.log(`   This week:  ${usersWeek.size}`);
  
  console.log('\n🛒 ORDERS');
  console.log(`   Total:      ${ordersSnapshot.size}`);
  console.log(`   Today:      ${ordersToday.size}`);
  console.log(`   This week:  ${ordersWeek.size}`);
  
  console.log('\n💰 REVENUE');
  console.log(`   Total:      ${formatPrice(totalRevenue)}`);
  console.log(`   Today:      ${formatPrice(revenueToday)}`);
  console.log(`   This week:  ${formatPrice(revenueWeek)}`);
  console.log(`   Avg ticket: ${formatPrice(avgTicket)}`);
  
  // Conversion rate
  const conversionRate = usersSnapshot.size > 0 
    ? ((ordersSnapshot.size / usersSnapshot.size) * 100).toFixed(1)
    : 0;
  console.log(`\n📈 CONVERSION: ${conversionRate}% of users have ordered`);
  
  console.log('\n' + '='.repeat(50));
  console.log(`Last updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
}

async function showNonBuyers(db, period) {
  const { start, end, label } = getDateRange(period);
  console.log(`\n👻 USERS WHO SIGNED UP BUT DIDN'T PURCHASE (${label})\n${'='.repeat(50)}`);
  
  // Get users in period
  let usersQuery = db.collection('users').orderBy('createdAt', 'desc');
  if (period !== 'all') {
    usersQuery = usersQuery.where('createdAt', '>=', start).where('createdAt', '<=', end);
  }
  const usersSnapshot = await usersQuery.get();
  
  // Get all orders to find buyers
  const ordersSnapshot = await db.collection('orders').get();
  const buyerEmails = new Set();
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    if (order.userEmail) {
      buyerEmails.add(order.userEmail.toLowerCase());
    }
  });
  
  // Find non-buyers
  const nonBuyers = [];
  usersSnapshot.forEach(doc => {
    const user = doc.data();
    const email = (user.email || doc.id).toLowerCase();
    if (!buyerEmails.has(email)) {
      nonBuyers.push({ id: doc.id, ...user });
    }
  });
  
  if (nonBuyers.length === 0) {
    console.log('🎉 All users in this period have made a purchase!');
    return;
  }
  
  console.log(`Found ${nonBuyers.length} user(s) who haven't purchased yet\n`);
  
  nonBuyers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.displayName || user.email || user.id}`);
    console.log(`   📧 Email: ${user.email || 'N/A'}`);
    console.log(`   📅 Signed up: ${formatDate(user.createdAt)}`);
    console.log('');
  });
}

// ========== MAIN ==========

async function main() {
  const [,, command, period = 'today'] = process.argv;
  
  if (!command) {
    console.log(`
Cookie Gallery Operations Dashboard
====================================

Usage:
  node scripts/ops-dashboard.js <command> [period]

Commands:
  summary              Overview of all metrics
  users [period]       List users who signed up
  orders [period]      List orders with details
  non-buyers [period]  Users who signed up but haven't purchased

Periods:
  today    Today only (default)
  week     Past 7 days
  month    Past 30 days
  all      All time

Examples:
  node scripts/ops-dashboard.js summary
  node scripts/ops-dashboard.js users today
  node scripts/ops-dashboard.js orders week
  node scripts/ops-dashboard.js non-buyers week
`);
    return;
  }
  
  const db = initFirebase();
  
  switch (command) {
    case 'users':
      await listUsers(db, period);
      break;
    case 'orders':
      await listOrders(db, period);
      break;
    case 'summary':
      await showSummary(db);
      break;
    case 'non-buyers':
    case 'nonbuyers':
      await showNonBuyers(db, period);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run without arguments to see usage.');
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
