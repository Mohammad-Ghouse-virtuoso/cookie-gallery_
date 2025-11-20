/**
 * K6 Performance Testing Configuration
 * Cookie Gallery - Performance Test Settings
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

// Test thresholds - performance goals
export const THRESHOLDS = {
  // 95% of requests should complete under 200ms
  http_req_duration: ['p(95)<200'],
  
  // 99% of requests should complete under 500ms
  'http_req_duration{expected_response:true}': ['p(99)<500'],
  
  // Error rate should be less than 1%
  http_req_failed: ['rate<0.01'],
  
  // Request rate should be at least 100 req/sec
  http_reqs: ['rate>100'],
  
  // Connection duration should be fast
  http_req_connecting: ['p(95)<100'],
  
  // TLS handshake should be fast
  http_req_tls_handshaking: ['p(95)<200'],
};

// Load test scenarios
export const SCENARIOS = {
  // Smoke test - verify system works with minimal load
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  
  // Load test - normal expected traffic
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },   // Ramp up to 10 users
      { duration: '3m', target: 10 },   // Stay at 10 users
      { duration: '1m', target: 50 },   // Ramp up to 50 users
      { duration: '3m', target: 50 },   // Stay at 50 users
      { duration: '1m', target: 0 },    // Ramp down to 0
    ],
  },
  
  // Stress test - push system to limits
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50
      { duration: '3m', target: 50 },   // Stay at 50
      { duration: '2m', target: 100 },  // Ramp up to 100
      { duration: '3m', target: 100 },  // Stay at 100
      { duration: '2m', target: 200 },  // Ramp up to 200
      { duration: '3m', target: 200 },  // Stay at 200
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },
  
  // Spike test - sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },   // Normal traffic
      { duration: '10s', target: 200 },  // Sudden spike
      { duration: '2m', target: 200 },   // Stay at spike
      { duration: '10s', target: 10 },   // Back to normal
      { duration: '1m', target: 10 },    // Stay normal
      { duration: '10s', target: 0 },    // Ramp down
    ],
  },
  
  // Soak test - sustained load over time
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '30m',
  },
};

// Test data
export const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'LoadTest123!',
};

export const TEST_ADDRESS = {
  fullName: 'Load Test User',
  email: 'loadtest@example.com',
  phone: '9876543210',
  address: '123 Test Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
};

export const TEST_STRIPE_CARD = {
  number: '4242424242424242',
  exp_month: 12,
  exp_year: 2030,
  cvc: '123',
};

// Performance metrics tags
export const TAGS = {
  webhook: { name: 'webhook' },
  checkout: { name: 'checkout' },
  payment: { name: 'payment' },
  health: { name: 'health' },
};

// Request timeouts
export const TIMEOUTS = {
  default: '30s',
  payment: '60s',
  webhook: '10s',
};

export default {
  BASE_URL,
  FRONTEND_URL,
  THRESHOLDS,
  SCENARIOS,
  TEST_USER,
  TEST_ADDRESS,
  TEST_STRIPE_CARD,
  TAGS,
  TIMEOUTS,
};
