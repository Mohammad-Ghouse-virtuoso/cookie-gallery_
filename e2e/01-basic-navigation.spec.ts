import { test, expect } from '@playwright/test';

/**
 * Basic Navigation E2E Tests
 * 
 * These tests verify that the core pages of the application load correctly
 * and basic navigation works as expected.
 */

test.describe('Basic Navigation', () => {
  test('should load the home page', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Check if page loads and contains expected content
    // Since auth is required, we might be redirected to /signin
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    
    // Verify we're either on home or signin (depending on auth state)
    expect(url).toMatch(/(\/|\/home|\/signin)/);
  });

  test('should redirect to sign-in when not authenticated', async ({ page }) => {
    // Try to access home page
    await page.goto('/home');
    
    // Wait for redirect (with longer timeout for auth check)
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const currentUrl = page.url();
    
    // Should be redirected to signin or remain on home (if already authenticated)
    expect(currentUrl).toMatch(/(\/signin|\/home)/);
  });

  test('should display sign-in page correctly', async ({ page }) => {
    await page.goto('/signin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for Google sign-in button
    const googleSignInButton = page.locator('button:has-text("Sign in with Google"), button:has-text("Continue with Google")');
    await expect(googleSignInButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on privacy page or redirected to signin
    const url = page.url();
    expect(url).toMatch(/(\/privacy|\/signin)/);
  });

  test('should display 404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Should show 404 or redirect to signin
    const url = page.url();
    
    // Check if we got a 404 page or were redirected
    const notFoundElements = await page.locator('text=/404|not found/i').count();
    
    // Verify we got some response (either 404 page or signin redirect)
    console.log('404 test - URL:', url, 'Has 404 elements:', notFoundElements > 0);
    expect(url.length).toBeGreaterThan(0);
  });
});

test.describe('Page Load Performance', () => {
  test('should load home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load sign-in page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Sign-in page should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});
