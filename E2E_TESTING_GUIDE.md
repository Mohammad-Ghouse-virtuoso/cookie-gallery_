# End-to-End (E2E) Testing Guide

## Overview

This document provides comprehensive guidance for running and maintaining E2E tests for the Cookie Gallery application using Playwright.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Authentication Setup](#authentication-setup)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+
- npm or yarn
- Chrome/Chromium browser (installed automatically by Playwright)

## Installation

### 1. Install Dependencies

```bash
# Install all project dependencies including Playwright
npm install

# Install Playwright browsers (if not already installed)
npx playwright install chromium
```

### 2. Setup Environment

Ensure the application can run locally:

```bash
# Frontend development server
npm run dev
```

The app should be accessible at `http://localhost:5173`

## Running Tests

### Run All E2E Tests

```bash
# Run all tests headless
npm run test:e2e

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed
```

### Run Specific Test Files

```bash
# Run a specific test file
npx playwright test e2e/01-basic-navigation.spec.ts

# Run tests matching a pattern
npx playwright test cart
```

### Run Tests in Different Browsers

```bash
# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Tests

```bash
# Run in debug mode
npx playwright test --debug

# Run specific test in debug mode
npx playwright test e2e/01-basic-navigation.spec.ts --debug
```

## Test Structure

### Test Organization

```
e2e/
├── helpers/
│   ├── auth.helper.ts       # Authentication utilities
│   └── cart.helper.ts       # Cart operation utilities
├── 01-basic-navigation.spec.ts    # Navigation & page load tests
├── 02-cookie-catalogue.spec.ts    # Product browsing tests
└── 03-cart-checkout.spec.ts       # Cart & checkout tests
```

### Test Naming Convention

- Test files: `##-feature-name.spec.ts`
- Test descriptions: Clear, descriptive names
- Use `describe` blocks to group related tests

## Authentication Setup

### Current Limitations

The application uses Firebase Authentication with Google OAuth. For comprehensive E2E testing, you need one of the following:

### Option 1: Firebase Auth Emulator (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only auth
```

Update `.env` to point to emulator:
```
VITE_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
```

### Option 2: Test Credentials

Create a dedicated test Google account and use it for E2E tests. Store credentials securely:

```bash
# Set environment variables
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="secure_password"
```

### Option 3: Mock Authentication

For development, you can bypass authentication by modifying the auth context in test mode.

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');
    
    // Act
    await page.click('button:has-text("Click Me")');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use Data Test IDs**: Add `data-testid` attributes to components for reliable selectors
   ```typescript
   await page.locator('[data-testid="add-to-cart"]').click();
   ```

2. **Wait for Network Idle**: Ensure dynamic content has loaded
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Handle Conditional Logic**: Skip tests when preconditions aren't met
   ```typescript
   if (url.includes('/signin')) {
     test.skip();
   }
   ```

4. **Use Helper Functions**: Reuse common operations
   ```typescript
   import { addItemToCart } from './helpers/cart.helper';
   await addItemToCart(page, 0);
   ```

5. **Take Screenshots on Failure**: Automatically enabled in config
   ```typescript
   screenshot: 'only-on-failure'
   ```

## Test Coverage

### Current Test Coverage

| Feature | Test File | Status |
|---------|-----------|--------|
| Basic Navigation | 01-basic-navigation.spec.ts | ✅ |
| Page Load Performance | 01-basic-navigation.spec.ts | ✅ |
| Cookie Catalogue | 02-cookie-catalogue.spec.ts | ✅ |
| Product Details | 02-cookie-catalogue.spec.ts | ✅ |
| Shopping Cart | 03-cart-checkout.spec.ts | ✅ |
| Checkout Process | 03-cart-checkout.spec.ts | ✅ |
| Order Success | 03-cart-checkout.spec.ts | ✅ |

### Future Test Coverage

- [ ] Full authentication flow with OAuth
- [ ] Stripe payment integration (test mode)
- [ ] Mobile responsive tests
- [ ] Cross-browser compatibility
- [ ] Performance benchmarks
- [ ] Accessibility tests

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Fail Due to Authentication

**Problem**: Tests are redirected to sign-in page

**Solutions**:
1. Set up Firebase Auth Emulator
2. Use test credentials
3. Skip authentication-dependent tests

### Timeout Errors

**Problem**: Tests timeout waiting for elements

**Solutions**:
```typescript
// Increase timeout for specific assertion
await expect(element).toBeVisible({ timeout: 10000 });

// Increase global timeout in config
use: {
  timeout: 30000
}
```

### Element Not Found

**Problem**: Selectors can't find elements

**Solutions**:
1. Use more flexible selectors
2. Add `data-testid` attributes
3. Wait for dynamic content to load

### Flaky Tests

**Problem**: Tests pass/fail inconsistently

**Solutions**:
1. Add proper waits
2. Use `waitForLoadState('networkidle')`
3. Enable retries in CI

## Viewing Test Reports

```bash
# After running tests, view the HTML report
npx playwright show-report
```

The report includes:
- Test results
- Screenshots of failures
- Traces for debugging
- Performance metrics

## Performance Testing

E2E tests include basic performance checks:

```typescript
test('should load page within acceptable time', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(5000);
});
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Firebase Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

## Support

For issues or questions:
1. Check this guide
2. Review Playwright documentation
3. Check existing issues in the repository
4. Create a new issue with test details

---

**Last Updated**: November 2025
**Playwright Version**: 1.x
**Status**: ✅ Active
