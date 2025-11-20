/**
 * Data generators for K6 performance tests
 * Generates realistic test data for load testing
 */

/**
 * Generate random cookie order data
 */
export function generateCookieOrder(virtualUser, iteration) {
  const cookieNames = [
    'Chocolate Chip Cookie',
    'Oatmeal Raisin Cookie',
    'Peanut Butter Cookie',
    'Sugar Cookie',
    'Double Chocolate Cookie',
    'White Chocolate Macadamia',
    'Snickerdoodle Cookie',
    'Gingerbread Cookie',
  ];

  const quantity = Math.floor(Math.random() * 5) + 1;
  const pricePerCookie = Math.floor(Math.random() * 5000) + 5000; // 50-100 INR per cookie
  
  return {
    name: cookieNames[Math.floor(Math.random() * cookieNames.length)],
    quantity: quantity,
    price: pricePerCookie,
    total: quantity * pricePerCookie,
  };
}

/**
 * Generate random order with multiple items
 */
export function generateOrder(virtualUser, iteration) {
  const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const items = [];
  let total = 0;

  for (let i = 0; i < itemCount; i++) {
    const item = generateCookieOrder(virtualUser, iteration);
    items.push(item);
    total += item.total;
  }

  return {
    orderId: `order_${Date.now()}_${virtualUser}_${iteration}`,
    items: items,
    totalAmount: total,
    currency: 'inr',
    timestamp: Date.now(),
  };
}

/**
 * Generate random customer address
 */
export function generateAddress(virtualUser) {
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal'];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];

  return {
    fullName: `Load Test User ${virtualUser}`,
    email: `loadtest${virtualUser}@example.com`,
    phone: `98765${String(43210 + virtualUser).padStart(5, '0')}`,
    address: `${Math.floor(Math.random() * 999) + 1} Test Street, Apt ${Math.floor(Math.random() * 99) + 1}`,
    city: city,
    state: state,
    pincode: String(Math.floor(Math.random() * 899999) + 100000),
  };
}

/**
 * Generate mock Stripe webhook event
 */
export function generateStripeWebhookEvent(virtualUser, iteration, eventType = 'checkout.session.completed') {
  const timestamp = Date.now();
  const sessionId = `cs_test_${timestamp}_${virtualUser}_${iteration}`;
  const paymentIntentId = `pi_test_${timestamp}_${virtualUser}_${iteration}`;
  const orderId = `order_${timestamp}_${virtualUser}_${iteration}`;

  return {
    id: `evt_${timestamp}_${virtualUser}_${iteration}`,
    type: eventType,
    created: Math.floor(timestamp / 1000),
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        payment_intent: paymentIntentId,
        amount_total: Math.floor(Math.random() * 50000) + 10000,
        currency: 'inr',
        payment_status: 'paid',
        status: 'complete',
        customer_email: `loadtest${virtualUser}@example.com`,
        metadata: {
          localOrderId: orderId,
        },
      },
    },
  };
}

/**
 * Generate random test scenario parameters
 */
export function generateTestScenario() {
  return {
    thinkTime: Math.floor(Math.random() * 3000) + 1000, // 1-4 seconds
    requestDelay: Math.floor(Math.random() * 500) + 100, // 100-600ms
  };
}

export default {
  generateCookieOrder,
  generateOrder,
  generateAddress,
  generateStripeWebhookEvent,
  generateTestScenario,
};
