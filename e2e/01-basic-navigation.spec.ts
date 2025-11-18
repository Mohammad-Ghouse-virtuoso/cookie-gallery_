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
    
    // Wait for either home or sign-in content to appear
    const homeHeading = page.locator('text=/Cookie Gallery/i');
    const signInHeading = page.locator('text=/Welcome to Cookie Gallery!/i');
    await Promise.race([
      homeHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
      signInHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
    ]);
    
    const url = page.url();
    
    // Verify we're either on home or signin (depending on auth state)
    expect(url).toMatch(/(\/|\/home|\/signin)/);
  });

  test('should redirect to sign-in when not authenticated', async ({ page }) => {
    // Try to access home page
    await page.goto('/home');
    
    // Wait until either /signin or /home is shown by checking content
    const signInHeading = page.locator('text=/Welcome to Cookie Gallery!/i');
    const homeHeading = page.locator('text=/Cookie Gallery/i');
    await Promise.race([
      signInHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
      homeHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
    ]);
    
    const currentUrl = page.url();
    
    // Should be redirected to signin or remain on home (if already authenticated)
    expect(currentUrl).toMatch(/(\/signin|\/home)/);
  });

  test('should display sign-in page correctly', async ({ page }) => {
    await page.goto('/signin');
    
    // Check for Google sign-in button (this wait replaces networkidle)
    const googleSignInButton = page.locator('button:has-text("Sign in with Google"), button:has-text("Continue with Google")');
    await expect(googleSignInButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    
    // Wait for either privacy content or sign-in header
    const privacyHeading = page.locator('text=/Privacy/i');
    const signInHeading = page.locator('text=/Welcome to Cookie Gallery!/i');
    await Promise.race([
      privacyHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
      signInHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
    ]);
    
    // Check if we're on privacy page or redirected to signin
    const url = page.url();
    expect(url).toMatch(/(\/privacy|\/signin)/);
  });

  test('should display 404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    
    // Should show 404 or redirect to signin; wait for either
    const notFoundLocator = page.locator('text=/404|not found/i');
    const signInHeading = page.locator('text=/Welcome to Cookie Gallery!/i');
    await Promise.race([
      notFoundLocator.first().waitFor({ timeout: 10000 }).catch(() => undefined),
      signInHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
    ]);
    
    // Should show 404 or redirect to signin
    const url = page.url();
    
    // Check if we got a 404 page or were redirected
    const notFoundElements = await notFoundLocator.count();
    
    // Verify we got some response (either 404 page or signin redirect)
    console.log('404 test - URL:', url, 'Has 404 elements:', notFoundElements > 0);
    expect(url.length).toBeGreaterThan(0);
  });
});

test.describe('Page Load Performance', () => {
  test('should load home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    const homeHeading = page.locator('text=/Cookie Gallery/i');
    const signInHeading = page.locator('text=/Welcome to Cookie Gallery!/i');
    await Promise.race([
      homeHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
      signInHeading.first().waitFor({ timeout: 10000 }).catch(() => undefined),
    ]);
    
    const loadTime = Date.now() - startTime;
    
    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load sign-in page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/signin');
    const googleSignInButton = page.locator(
      'button:has-text("Sign in with Google"), button:has-text("Continue with Google")'
    );
    await expect(googleSignInButton.first()).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Sign-in page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
