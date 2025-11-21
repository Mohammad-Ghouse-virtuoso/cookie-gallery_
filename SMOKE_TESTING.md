# Smoke Testing Documentation

## Overview

Smoke testing validates that critical functionality works after deployment. These are quick sanity checks (< 2 minutes) that run before each release to catch obvious regressions.

## Test Results

**Status**: ✅ **ALL TESTS PASSING**  
**Total Tests**: 26/26 (100%)  
**Execution Time**: 41.6s  
**Last Run**: November 21, 2025

## Running Smoke Tests

### Quick Start
```bash
# Run all smoke tests
npm run test:e2e -- e2e/07-smoke-tests.spec.ts

# Run with UI
npx playwright test e2e/07-smoke-tests.spec.ts --ui

# Run quick critical path check only
npx playwright test e2e/07-smoke-tests.spec.ts:332
```

### Pre-Deployment
```bash
# Run before every deployment
npm run test:e2e -- e2e/07-smoke-tests.spec.ts --reporter=line

# Run with retries for flaky network
npx playwright test e2e/07-smoke-tests.spec.ts --retries=2
```

## Test Coverage

### Backend Health Checks (3 tests)
- ✅ Backend server is running and responding
- ✅ Backend returns valid boot ID format  
- ✅ Backend has CORS properly configured

### Frontend Availability (3 tests)
- ✅ Homepage loads successfully
- ✅ Critical page elements are present
- ✅ No critical JavaScript errors on load

### Navigation & Routing (3 tests)
- ✅ Sign-in page is accessible
- ✅ Cookies catalogue route exists
- ✅ Checkout route exists

### API Endpoints (4 tests)
- ✅ Payment intent creation endpoint exists
- ✅ Payment details endpoint exists
- ✅ Save order endpoint exists
- ✅ Save user endpoint exists

### Static Assets (3 tests)
- ✅ Favicon is accessible
- ✅ robots.txt is accessible
- ✅ sitemap.xml is accessible

### Performance Basics (2 tests)
- ✅ Homepage loads within acceptable time (< 5s)
- ✅ API health check responds quickly (< 500ms)

### External Dependencies (1 test)
- ✅ Can load external CDN resources

### Error Handling (2 tests)
- ✅ 404 page returns proper status
- ✅ Invalid API endpoint returns 404

### Security Headers (2 tests)
- ✅ Backend has security headers
- ✅ Frontend has appropriate Content-Type

### Data Validation (2 tests)
- ✅ Invalid payment amount is handled
- ✅ Invalid currency is handled

### Critical Path Quick Check (1 test)
- ✅ Complete smoke test in under 30 seconds

## Configuration

### Environment Variables
```bash
# Backend URL (default: http://localhost:5000)
VITE_API_BASE_URL=http://localhost:5000

# Frontend URL (default: http://localhost:5173)
# Hardcoded in tests
```

### Timeouts
- Per-test timeout: 10 seconds
- Critical path timeout: 30 seconds
- Homepage load: < 5 seconds
- API response: < 500ms

## When to Run

### Always Run Before
1. **Production Deployment** - Validate all systems operational
2. **Staging Deployment** - Catch issues early
3. **Major Releases** - Ensure no regressions
4. **Infrastructure Changes** - Verify connectivity
5. **Emergency Hotfixes** - Quick validation

### Optional Runs
- After minor bug fixes (if touching critical paths)
- During CI/CD pipeline (as gate before deployment)
- Hourly/Daily automated checks in production

## Integration with CI/CD

### Pre-Deployment Gate
```yaml
# .github/workflows/deploy.yml
- name: Run Smoke Tests
  run: |
    npm run test:e2e -- e2e/07-smoke-tests.spec.ts --reporter=line
  env:
    VITE_API_BASE_URL: ${{ secrets.STAGING_API_URL }}
```

### Post-Deployment Validation
```bash
# After deployment
VITE_API_BASE_URL=https://api.production.com \
  npx playwright test e2e/07-smoke-tests.spec.ts
```

## What Smoke Tests DON'T Cover

Smoke tests are **not** comprehensive:
- ❌ Full user authentication flow
- ❌ Complete payment processing
- ❌ Database integrity
- ❌ Complex business logic
- ❌ Edge cases and error scenarios
- ❌ Performance under load
- ❌ Security vulnerabilities

For comprehensive testing, see:
- E2E Tests (`e2e/01-04-*.spec.ts`)
- Performance Tests (`performance/*.test.js`)
- Accessibility Tests (`e2e/05-accessibility.spec.ts`)
- Visual Regression (`e2e/06-visual-regression.spec.ts`)
- API Contract Tests (`src/backend/__tests__/contracts/`)

## Troubleshooting

### Backend Not Running
```
Error: connect ECONNREFUSED 127.0.0.1:5000
```
**Solution**: Start backend server
```bash
cd src/backend && node server.js
```

### Frontend Not Running
```
Error: net::ERR_CONNECTION_REFUSED at http://localhost:5173
```
**Solution**: Start frontend dev server
```bash
npm run dev
```

### Slow Test Execution
```
Tests taking > 2 minutes
```
**Solution**: 
- Check network connectivity
- Reduce timeout values if stable
- Run in parallel (not recommended for smoke tests)

### Flaky Tests
```
Tests passing locally but failing in CI
```
**Solution**:
- Increase timeout values
- Add retries: `--retries=2`
- Check environment variables in CI

## Best Practices

### DO
✅ Run smoke tests before every deployment  
✅ Keep tests fast (< 2 minutes total)  
✅ Test only critical happy paths  
✅ Fail fast on critical errors  
✅ Run in production-like environment  
✅ Monitor test execution time  

### DON'T
❌ Test complex business logic  
❌ Test all edge cases  
❌ Use smoke tests for comprehensive coverage  
❌ Add tests that take > 5 seconds each  
❌ Test features still in development  
❌ Run against production without safeguards  

## Maintenance

### Adding New Tests
```typescript
test('new critical feature works', async ({ page }) => {
  // 1. Navigate to feature
  await page.goto(`${FRONTEND_URL}/new-feature`);
  
  // 2. Verify core functionality
  await expect(page.locator('h1')).toBeVisible();
  
  // 3. Keep it simple and fast
});
```

### Removing Tests
Remove tests when:
- Feature is deprecated
- Test becomes flaky despite fixes
- Test takes too long (> 10s)
- Test duplicates other smoke tests

### Updating Tests
Update when:
- URLs change
- Expected response codes change
- New critical endpoints added
- Page structure significantly changes

## Metrics

### Current Performance
- **Total Execution**: 41.6s
- **Average Per Test**: 1.6s
- **Fastest Test**: < 0.5s (health check)
- **Slowest Test**: ~5s (page loads)

### Target SLAs
- **Total Execution**: < 2 minutes
- **Pass Rate**: > 95%
- **Flakiness**: < 5%
- **API Response**: < 500ms
- **Page Load**: < 5s

### Historical Trends
Track over time:
- Execution time (should remain stable)
- Pass rate (should be consistently high)
- Failure patterns (identify flaky tests)

## Support

For issues or questions:
1. Check this documentation
2. Review test output and traces
3. Check related E2E test documentation
4. Review git history for recent changes

## Related Documentation
- `TESTING_GUIDE_COMPLETE.md` - Comprehensive testing overview
- `E2E_TESTING_GUIDE.md` - E2E testing documentation
- `playwright.config.ts` - Playwright configuration
- `package.json` - Test scripts and dependencies

