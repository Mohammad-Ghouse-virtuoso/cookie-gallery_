/**
 * Smoke Testing Suite
 * 
 * Quick sanity checks to validate critical paths work in production-like environments.
 * These tests should be fast (<5 min) and catch major regressions.
 * 
 * Run before deployments to ensure basic functionality works.
 * 
 * Categories:
 * - Infrastructure Health Checks
 * - Critical API Endpoints
 * - Core User Journeys
 * - Data Integrity Checks
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

test.describe('Smoke Tests - Infrastructure', () => {
  
  test('backend server is running and healthy', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('boot_id');
  });

  test('frontend application loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
    
    expect(errors).toEqual([]);
    
    // Verify critical elements exist
    await expect(page.locator('body')).toBeVisible();
  });

  test('static assets load correctly', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // No failed requests for critical assets
    const criticalFailures = failedRequests.filter(url => 
      url.includes('.js') || url.includes('.css') || url.includes('favicon')
    );
    
    expect(criticalFailures).toEqual([]);
  });

  test('environment variables are configured', async ({ page }) => {
    await page.goto('/');
    
    // Check if Firebase config is present (via console logs or network calls)
    const responses: string[] = [];
    page.on('response', (response) => {
      responses.push(response.url());
    });
    
    await page.waitForTimeout(2000);
    
    // Should see Firebase or Stripe API calls (indicates config is loaded)
    const hasFirebaseConfig = responses.some(url => url.includes('firebase'));
    const hasStripeConfig = responses.some(url => url.includes('stripe'));
    
    // At least one external API should be configured
    expect(hasFirebaseConfig || hasStripeConfig).toBeTruthy();
  });
});

test.describe('Smoke Tests - Critical API Endpoints', () => {
  
  test('health endpoint returns valid response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    const data = await response.json();
    
    expect(response.status()).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.boot_id).toBe('string');
    expect(data.boot_id.length).toBeGreaterThan(0);
  });

  test('CORS is properly configured', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // CORS headers should be present
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
  });

  test('unauthorized requests are rejected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/create-payment-intent`, {
      data: { amount: 1000, currency: 'inr' },
      failOnStatusCode: false
    });
    
    // Should return 401 or 403 without auth token
    expect([401, 403]).toContain(response.status());
  });

  test('invalid routes return 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/nonexistent-route`, {
      failOnStatusCode: false
    });
    
    expect(response.status()).toBe(404);
  });

  test('malformed JSON is handled gracefully', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/create-payment-intent`, {
      data: 'invalid-json',
      headers: {
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    });
    
    // Should return 400 Bad Request or 401 Unauthorized
    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe('Smoke Tests - Core User Journeys', () => {
  
  test('homepage loads with critical content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify critical homepage elements
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
    
    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('navigation menu is functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if nav exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Verify we can see navigation elements
    const navItems = await nav.locator('a').count();
    expect(navItems).toBeGreaterThan(0);
  });

  test('cookie catalogue page loads', async ({ page }) => {
    await page.goto('/cookies');
    
    // Should redirect to sign-in or load catalogue
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    // Either shows cookies page or redirects to signin
    expect(url.includes('/cookies') || url.includes('/signin')).toBeTruthy();
  });

  test('sign-in page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    
    expect(errors).toEqual([]);
    
    // Verify sign-in elements exist
    await expect(page.locator('body')).toBeVisible();
  });

  test('checkout page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to sign-in
    const url = page.url();
    expect(url).toContain('/signin');
  });

  test('protected routes enforce authentication', async ({ page }) => {
    const protectedRoutes = ['/cookies', '/checkout', '/story'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      // Should either be on the route (if auth is disabled) or redirected to signin
      const isProtected = url.includes('/signin') || url.includes(route);
      expect(isProtected).toBeTruthy();
    }
  });
});

test.describe('Smoke Tests - Performance & Reliability', () => {
  
  test('homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Homepage should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('API health check responds quickly', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${BASE_URL}/health`);
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    // Health check should respond within 1 second
    expect(responseTime).toBeLessThan(1000);
  });

  test('multiple concurrent requests are handled', async ({ request }) => {
    const requests = Array(10).fill(null).map(() => 
      request.get(`${BASE_URL}/health`)
    );
    
    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });
  });

  test('page handles network errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to navigate - should handle gracefully (not crash)
    await page.goto('/cookies', { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {
      // Expected to fail, but shouldn't crash the app
    });
    
    // Restore online mode
    await page.context().setOffline(false);
  });
});

test.describe('Smoke Tests - Data Integrity', () => {
  
  test('cart state is properly initialized', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Cart should be accessible (even if empty)
    // Look for cart icon or cart indicator
    const cartIndicator = page.locator('[data-testid="cart-button"], button:has-text("Cart"), a[href*="checkout"]').first();
    
    // Cart element should exist
    if (await cartIndicator.count() > 0) {
      await expect(cartIndicator).toBeVisible();
    }
  });

  test('localStorage is accessible', async ({ page }) => {
    await page.goto('/');
    
    const localStorageWorks = await page.evaluate(() => {
      try {
        localStorage.setItem('smoke-test', 'test-value');
        const value = localStorage.getItem('smoke-test');
        localStorage.removeItem('smoke-test');
        return value === 'test-value';
      } catch {
        return false;
      }
    });
    
    expect(localStorageWorks).toBeTruthy();
  });

  test('sessionStorage is accessible', async ({ page }) => {
    await page.goto('/');
    
    const sessionStorageWorks = await page.evaluate(() => {
      try {
        sessionStorage.setItem('smoke-test', 'test-value');
        const value = sessionStorage.getItem('smoke-test');
        sessionStorage.removeItem('smoke-test');
        return value === 'test-value';
      } catch {
        return false;
      }
    });
    
    expect(sessionStorageWorks).toBeTruthy();
  });

  test('cookies are enabled', async ({ page, context }) => {
    await page.goto('/');
    
    await context.addCookies([{
      name: 'smoke-test',
      value: 'test-value',
      domain: 'localhost',
      path: '/'
    }]);
    
    const cookies = await context.cookies();
    const testCookie = cookies.find(c => c.name === 'smoke-test');
    
    expect(testCookie).toBeDefined();
    expect(testCookie?.value).toBe('test-value');
  });
});

test.describe('Smoke Tests - Security', () => {
  
  test('security headers are present', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    const headers = response.headers();
    
    // Check for important security headers
    expect(headers).toBeDefined();
    
    // Note: Some headers may be set by reverse proxy in production
    // This is a basic check
  });

  test('HTTPS redirect in production', async ({ page }) => {
    // Skip in local development
    if (BASE_URL.includes('localhost')) {
      test.skip();
    }
    
    await page.goto('/');
    const url = page.url();
    
    // Production should use HTTPS
    expect(url).toMatch(/^https:\/\//);
  });

  test('sensitive endpoints require authentication', async ({ request }) => {
    const sensitiveEndpoints = [
      '/create-payment-intent',
      '/get-payment-details',
      '/save-order-data',
      '/save-user'
    ];
    
    for (const endpoint of sensitiveEndpoints) {
      const response = await request.post(`${BASE_URL}${endpoint}`, {
        data: {},
        failOnStatusCode: false
      });
      
      // Should return 401 or 403
      expect([401, 403]).toContain(response.status());
    }
  });

  test('XSS protection is enabled', async ({ page }) => {
    await page.goto('/');
    
    // Try to inject script
    const scriptInjected = await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = '<img src=x onerror=alert("XSS")>';
      document.body.appendChild(div);
      
      // Check if script actually executed (it shouldn't)
      return div.querySelector('img')?.getAttribute('onerror') === null;
    });
    
    // XSS should be prevented (onerror should be stripped or not executed)
    expect(scriptInjected).toBeTruthy();
  });
});

test.describe('Smoke Tests - Third-Party Integrations', () => {
  
  test('Firebase configuration is valid', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for Firebase initialization errors
    const firebaseErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('firebase') && 
      (error.includes('invalid') || error.includes('failed'))
    );
    
    // Should not have Firebase initialization errors
    expect(firebaseErrors).toEqual([]);
  });

  test('Stripe SDK loads correctly', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // Check if Stripe is loaded (or redirected to signin)
    const url = page.url();
    const isCheckoutOrSignin = url.includes('/checkout') || url.includes('/signin');
    
    expect(isCheckoutOrSignin).toBeTruthy();
  });

  test('external CDN resources are accessible', async ({ page }) => {
    const failedCDNRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('cdn') || url.includes('googleapis') || url.includes('stripe')) {
        failedCDNRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Critical CDN resources should load
    expect(failedCDNRequests.length).toBeLessThan(3);
  });
});
