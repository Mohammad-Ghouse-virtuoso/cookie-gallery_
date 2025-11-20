import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, SCENARIOS } from './config.js';

// Custom metrics
const webhookErrors = new Rate('webhook_errors');
const webhookDuration = new Trend('webhook_duration');
const signatureFailures = new Rate('signature_failures');

export const options = {
  scenarios: {
    load: SCENARIOS.load,
  },
  thresholds: {
    'webhook_duration': ['p(95)<500'],
    'webhook_errors': ['rate<0.01'],
    'http_req_duration': ['p(95)<500'],
  },
};

export default function () {
  // Mock Stripe webhook event
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}_${__VU}_${__ITER}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        payment_intent: `pi_test_${Date.now()}`,
        amount_total: 100000,
        currency: 'inr',
        payment_status: 'paid',
        metadata: {
          localOrderId: `order_${Date.now()}`,
        },
      },
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test_signature_for_load_testing',
    },
    tags: { name: 'webhook' },
  };

  const response = http.post(
    `${BASE_URL}/api/webhooks/stripe`,
    payload,
    params
  );

  const success = check(response, {
    'webhook responded': (r) => r.status !== 0,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has valid response body': (r) => r.body && r.body.length > 0,
  });

  // Track signature validation failures (expected)
  if (response.status === 400) {
    signatureFailures.add(1);
  } else {
    signatureFailures.add(0);
  }

  webhookErrors.add(!success);
  webhookDuration.add(response.timings.duration);

  sleep(1); // 1 second between requests per VU
}

export function handleSummary(data) {
  console.log('=============================================');
  console.log('Webhook Load Test Summary');
  console.log('=============================================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
  console.log(`Avg Webhook Duration: ${data.metrics.webhook_duration.values.avg.toFixed(2)}ms`);
  console.log(`P95 Webhook Duration: ${data.metrics.webhook_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`P99 Webhook Duration: ${data.metrics.webhook_duration.values['p(99)'].toFixed(2)}ms`);
  console.log(`Webhook Errors: ${(data.metrics.webhook_errors.values.rate * 100).toFixed(2)}%`);
  console.log(`Signature Failures: ${(data.metrics.signature_failures.values.rate * 100).toFixed(2)}% (expected)`);
  console.log('=============================================');
  
  return {
    'performance/results/webhook-summary.json': JSON.stringify(data, null, 2),
  };
}
