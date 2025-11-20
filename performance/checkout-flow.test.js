import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL } from './config.js';

// Custom metrics
const checkoutErrors = new Rate('checkout_errors');
const paymentIntentDuration = new Trend('payment_intent_duration');
const authFailures = new Rate('auth_failures');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '3m', target: 20 },   // Stay
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'payment_intent_duration': ['p(95)<800'],
    'checkout_errors': ['rate<0.05'],
  },
};

export default function () {
  const orderData = {
    amount: Math.floor(Math.random() * 50000) + 10000, // Random amount 100-500 INR
    currency: 'inr',
    items: [
      {
        name: `Cookie ${__VU}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.floor(Math.random() * 10000) + 5000,
      },
    ],
  };

  group('Create Payment Intent', function () {
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_firebase_token_for_load_testing',
      },
    };

    const response = http.post(
      `${BASE_URL}/api/create-payment-intent`,
      JSON.stringify(orderData),
      params
    );

    // Track auth failures (expected without valid token)
    if (response.status === 401 || response.status === 403) {
      authFailures.add(1);
    } else {
      authFailures.add(0);
    }

    const success = check(response, {
      'endpoint responded': (r) => r.status !== 0,
      'response time acceptable': (r) => r.timings.duration < 1000,
      'has response body': (r) => r.body && r.body.length > 0,
    });

    checkoutErrors.add(!success);
    paymentIntentDuration.add(response.timings.duration);
  });

  sleep(2); // User think time - 2 seconds between checkout attempts
}

export function handleSummary(data) {
  console.log('=============================================');
  console.log('Checkout Flow Performance Test Summary');
  console.log('=============================================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
  console.log(`Avg Payment Intent Duration: ${data.metrics.payment_intent_duration.values.avg.toFixed(2)}ms`);
  console.log(`P95 Payment Intent Duration: ${data.metrics.payment_intent_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`P99 Payment Intent Duration: ${data.metrics.payment_intent_duration.values['p(99)'].toFixed(2)}ms`);
  console.log(`Checkout Errors: ${(data.metrics.checkout_errors.values.rate * 100).toFixed(2)}%`);
  console.log(`Auth Failures: ${(data.metrics.auth_failures.values.rate * 100).toFixed(2)}% (expected)`);
  console.log('=============================================');
  
  return {
    'performance/results/checkout-summary.json': JSON.stringify(data, null, 2),
  };
}
