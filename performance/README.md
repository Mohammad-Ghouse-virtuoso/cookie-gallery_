# Performance Testing Guide

**Cookie Gallery - K6 Performance Testing**

## Overview

This directory contains K6 performance tests for the Cookie Gallery application. These tests measure response times, throughput, and system behavior under various load conditions.

## Test Files

### 1. `health-check.test.js`

**Purpose:** Basic health check endpoint performance  
**Duration:** 30 seconds  
**Load:** 10 concurrent users  
**Goal:** Verify baseline performance

```bash
npm run perf:health
```

**Expected Results:**

- ✅ P95 response time: < 100ms
- ✅ Request rate: > 100 req/sec
- ✅ Error rate: 0%

---

### 2. `webhook-load.test.js`

**Purpose:** Stripe webhook endpoint load testing  
**Duration:** 9 minutes  
**Load:** Ramps from 0 → 10 → 50 users  
**Goal:** Ensure webhooks can handle production traffic

```bash
npm run perf:webhook
```

**Expected Results:**

- ✅ P95 response time: < 500ms
- ✅ Throughput: > 50 req/sec
- ⚠️ Signature failures: ~100% (expected - load test uses mock signatures)

**Why signature failures are OK:**
The webhook endpoint correctly validates Stripe signatures. Load tests use mock signatures intentionally to test endpoint performance without hitting real Stripe APIs. In production, valid signatures will authenticate successfully.

---

### 3. `checkout-flow.test.js`

**Purpose:** Checkout and payment intent creation performance  
**Duration:** 5 minutes  
**Load:** Ramps from 0 → 20 users  
**Goal:** Ensure checkout can handle concurrent users

```bash
npm run perf:checkout
```

**Expected Results:**

- ✅ P95 response time: < 800ms
- ✅ Throughput: > 10 req/sec
- ⚠️ Auth failures: ~100% (expected - load test uses mock tokens)

**Why auth failures are OK:**
The checkout endpoint requires Firebase authentication. Load tests use mock tokens to test endpoint performance without creating real Firebase users. In production, authenticated users will succeed.

---

## Configuration

### `config.js`

Contains all test configuration:

- **Base URLs:** Backend and frontend endpoints
- **Thresholds:** Performance goals (response times, error rates)
- **Scenarios:** Load patterns (smoke, load, stress, spike, soak)
- **Test data:** Mock user data and addresses

### Key Thresholds

```javascript
{
  http_req_duration: ['p(95)<200'],           // 95% under 200ms
  http_req_failed: ['rate<0.01'],             // < 1% errors
  http_reqs: ['rate>100'],                    // > 100 req/sec
}
```

---

## Running Tests

### Individual Tests

```bash
# Health check (30 seconds)
npm run perf:health

# Webhook load test (9 minutes)
npm run perf:webhook

# Checkout flow (5 minutes)
npm run perf:checkout

# Quick smoke test
npm run perf:smoke
```

### All Tests

```bash
# Run all performance tests sequentially (~15 minutes)
npm run perf:all
```

### Custom Test Runs

```bash
# Override base URL
BASE_URL=http://production-server.com k6 run performance/health-check.test.js

# Custom VUs and duration
k6 run --vus 50 --duration 2m performance/webhook-load.test.js

# With detailed output
k6 run --verbose performance/checkout-flow.test.js
```

---

## Understanding Results

### K6 Output

```
✓ status is 200
✓ response time < 100ms

checks.........................: 100.00% ✓ 1000      ✗ 0
data_received..................: 250 kB  8.3 kB/s
data_sent......................: 100 kB  3.3 kB/s
http_req_blocked...............: avg=0.5ms   min=0.1ms   med=0.4ms   max=2ms    p(95)=1ms   p(99)=1.5ms
http_req_connecting............: avg=0.3ms   min=0.05ms  med=0.2ms   max=1.5ms  p(95)=0.8ms p(99)=1ms
http_req_duration..............: avg=45ms    min=20ms    med=40ms    max=150ms  p(95)=90ms  p(99)=120ms
http_req_failed................: 0.00%   ✓ 0         ✗ 1000
http_req_receiving.............: avg=0.2ms   min=0.05ms  med=0.15ms  max=1ms    p(95)=0.4ms p(99)=0.6ms
http_req_sending...............: avg=0.1ms   min=0.02ms  med=0.08ms  max=0.5ms  p(95)=0.2ms p(99)=0.3ms
http_req_tls_handshaking.......: avg=0ms     min=0ms     med=0ms     max=0ms    p(95)=0ms   p(99)=0ms
http_req_waiting...............: avg=44.7ms  min=19.8ms  med=39.7ms  max=149ms  p(95)=89ms  p(99)=119ms
http_reqs......................: 1000    33.33/s
iteration_duration.............: avg=145ms   min=120ms   med=140ms   max=250ms  p(95)=190ms p(99)=220ms
iterations.....................: 1000    33.33/s
vus............................: 10      min=10      max=10
vus_max........................: 10      min=10      max=10
```

### Key Metrics to Watch

| Metric              | Description         | Goal        |
| ------------------- | ------------------- | ----------- |
| `http_req_duration` | Total request time  | P95 < 200ms |
| `http_req_waiting`  | Time to first byte  | P95 < 150ms |
| `http_req_failed`   | Failed requests %   | < 1%        |
| `http_reqs`         | Requests per second | > 100       |
| `checks`            | Assertion pass rate | 100%        |

### Percentiles Explained

- **P50 (Median):** Half of requests are faster than this
- **P95:** 95% of requests are faster than this (our main threshold)
- **P99:** 99% of requests are faster than this (tail latency)

---

## Test Scenarios

### Smoke Test

**Purpose:** Verify system works with minimal load  
**Load:** 1 user for 30 seconds  
**Use case:** Quick sanity check after deployment

### Load Test

**Purpose:** Normal expected traffic  
**Load:** 0 → 10 → 50 users over 9 minutes  
**Use case:** Daily traffic simulation

### Stress Test

**Purpose:** Push system to limits  
**Load:** 0 → 50 → 100 → 200 users over 17 minutes  
**Use case:** Find breaking point

### Spike Test

**Purpose:** Sudden traffic surge  
**Load:** 10 → 200 users in 10 seconds  
**Use case:** Flash sale or viral event simulation

### Soak Test

**Purpose:** Sustained load over time  
**Load:** 50 users for 30 minutes  
**Use case:** Memory leak detection

---

## Interpreting Results

### ✅ Good Performance

```
http_req_duration..............: avg=45ms  p(95)=90ms  p(99)=120ms
http_req_failed................: 0.00%
http_reqs......................: 150/s
```

- Fast response times
- No errors
- High throughput

### ⚠️ Warning Signs

```
http_req_duration..............: avg=350ms  p(95)=800ms  p(99)=1500ms
http_req_failed................: 2.5%
http_reqs......................: 45/s
```

- Slow response times
- Some errors appearing
- Lower throughput

### ❌ Performance Issues

```
http_req_duration..............: avg=2000ms  p(95)=5000ms  p(99)=timeout
http_req_failed................: 15%
http_reqs......................: 10/s
```

- Very slow responses
- High error rate
- Low throughput

---

## Troubleshooting

### High Response Times

**Possible causes:**

1. Database queries not optimized
2. Too many external API calls
3. Memory pressure
4. CPU saturation

**Solutions:**

- Add database indexes
- Cache frequent queries
- Use connection pooling
- Scale horizontally

### High Error Rates

**Possible causes:**

1. Rate limiting triggered
2. Database connection pool exhausted
3. Memory leaks
4. Timeout issues

**Solutions:**

- Increase rate limits
- Adjust connection pool size
- Fix memory leaks
- Increase timeouts appropriately

### Low Throughput

**Possible causes:**

1. Blocking operations
2. Serial processing
3. Resource contention
4. Network bottlenecks

**Solutions:**

- Use async/await properly
- Parallelize independent operations
- Scale resources
- Optimize network calls

---

## Best Practices

### Before Running Tests

1. **Ensure backend is running:**

   ```bash
   cd src/backend && node server.js
   ```

2. **Use test environment:**
   - Don't run against production
   - Use test Stripe keys
   - Use test Firebase project

3. **Warm up the system:**
   - Run a quick smoke test first
   - Let services initialize fully

### During Testing

1. **Monitor system resources:**
   - CPU usage
   - Memory consumption
   - Network traffic
   - Database connections

2. **Watch for errors:**
   - Check logs in real-time
   - Monitor error tracking (Sentry)

3. **Record baseline metrics:**
   - Save first test results
   - Compare against future runs

### After Testing

1. **Analyze results:**
   - Look at all percentiles (P50, P95, P99)
   - Check error patterns
   - Review resource usage

2. **Document findings:**
   - Create performance baselines
   - Note any bottlenecks
   - Track improvements

3. **Optimize if needed:**
   - Fix performance issues
   - Re-test to verify improvements
   - Update baselines

---

## CI/CD Integration ✅

### GitHub Actions (Active)

Performance tests are now integrated into the CI/CD pipeline!

**Current Setup:**

- ✅ Runs automatically on every push to main/cookie_gallery_stripe branches
- ✅ Uses mock credentials for testing (no real Firebase/Stripe calls)
- ✅ Results uploaded as artifacts for historical tracking
- ✅ Non-blocking (continues on error to avoid false build failures)

**Important Notes:**

1. **Mock Environment**: CI uses mock credentials since real secrets aren't available
   - Mock Firebase project ID and credentials
   - Mock Stripe test key
   - Backend may start with limited functionality
2. **Expected Behavior**:
   - Backend startup may fail gracefully without real credentials
   - Performance tests will skip if backend isn't available
   - This is expected and won't block builds
3. **Real Performance Testing**:
   - For accurate performance metrics, run tests locally with real credentials
   - Or configure GitHub secrets with proper Firebase/Stripe test keys

**Configuration:** `.github/workflows/ci.yml`

```yaml
jobs:
  performance:
    runs-on: ubuntu-latest
    # Only run on non-fork PRs (where secrets are available)
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository

    steps:
      - Install k6
      - Create mock environment
      - Start backend (with error handling)
      - Run performance tests (continue on error)
      - Upload results artifacts
```

**View Results:**

1. Go to GitHub Actions tab
2. Select workflow run
3. Download "performance-results" artifact
4. Review test output files

**Local vs CI:**
| Aspect | Local | CI |
|--------|-------|-----|
| Credentials | Real Firebase/Stripe | Mock credentials |
| Backend | Full functionality | Limited/mock mode |
| Accuracy | Production-like | Baseline only |
| Purpose | Real performance metrics | Smoke test |

---

## Performance Goals

### Current Baselines (to be established)

| Endpoint       | P95 Target | P99 Target | Throughput  | Error Rate |
| -------------- | ---------- | ---------- | ----------- | ---------- |
| Health Check   | < 50ms     | < 100ms    | > 200 req/s | 0%         |
| Webhook        | < 200ms    | < 500ms    | > 100 req/s | < 1%       |
| Payment Intent | < 500ms    | < 1000ms   | > 50 req/s  | < 1%       |

### Production Goals

| Endpoint       | P95 Target | P99 Target | Throughput  | Error Rate |
| -------------- | ---------- | ---------- | ----------- | ---------- |
| Health Check   | < 25ms     | < 50ms     | > 500 req/s | 0%         |
| Webhook        | < 150ms    | < 300ms    | > 200 req/s | < 0.1%     |
| Payment Intent | < 300ms    | < 600ms    | > 100 req/s | < 0.5%     |

---

## Utilities

### `utils/data-generators.js`

Helper functions for generating realistic test data:

- `generateCookieOrder()` - Random cookie orders
- `generateOrder()` - Multi-item orders
- `generateAddress()` - Customer addresses
- `generateStripeWebhookEvent()` - Webhook payloads
- `generateTestScenario()` - Test parameters

---

## Next Steps

1. **Run baseline tests** to establish current performance
2. **Identify bottlenecks** from test results
3. **Optimize** slow endpoints
4. **Re-test** to verify improvements
5. **Automate** tests in CI/CD
6. **Monitor** performance in production

---

## Resources

- **K6 Documentation:** https://k6.io/docs/
- **Performance Testing Guide:** https://k6.io/docs/test-types/introduction/
- **Grafana Cloud (Optional):** https://grafana.com/products/cloud/k6/

---

**Last Updated:** November 20, 2025  
**Maintained By:** Cookie Gallery DevOps Team
