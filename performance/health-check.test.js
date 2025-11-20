import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, THRESHOLDS } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export default function () {
  // Health check endpoint
  const res = http.get(`${BASE_URL}/health`);
  
  // Verify response
  const checkResult = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has ok field': (r) => r.json('ok') === true,
    'has boot_id': (r) => r.json('boot_id') !== undefined,
  });
  
  errorRate.add(!checkResult);
  
  sleep(0.1); // 100ms pause between requests
}

export function handleSummary(data) {
  console.log('=============================================');
  console.log('Health Check Performance Test Summary');
  console.log('=============================================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
  console.log('=============================================');
  
  return {
    'performance/results/health-check-summary.json': JSON.stringify(data, null, 2),
  };
}
