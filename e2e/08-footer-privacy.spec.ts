// e2e/08-footer-privacy.spec.ts
// Tests for Footer & Privacy Page Features
// Note: Tests requiring authentication are commented out - Firebase Auth Emulator needed

import { test, expect } from '@playwright/test';

test.describe('Footer & Privacy Page Features', () => {
  
  // ============================================
  // Social Coming Soon Pages (Public - No Auth Required)
  // ============================================
  
  test.describe('Social Coming Soon Pages', () => {
    
    test('Instagram page shows correct quirky message', async ({ page }) => {
      await page.goto('/social/instagram');
      
      // Verify platform name
      await expect(page.locator('h1')).toContainText('Instagram');
      
      // Verify quirky message
      await expect(page.getByText(/too busy being delicious/i)).toBeVisible();
      await expect(page.getByText(/dough therapy/i)).toBeVisible();
      
      // Verify back button exists
      await expect(page.getByRole('link', { name: /back to cookie gallery/i })).toBeVisible();
    });

    test('X/Twitter page shows correct quirky message', async ({ page }) => {
      await page.goto('/social/x');
      
      await expect(page.locator('h1')).toContainText('X (Twitter)');
      await expect(page.getByText(/crumb-believable/i)).toBeVisible();
      await expect(page.getByText(/crispy as our edges/i)).toBeVisible();
    });

    test('Facebook page shows correct quirky message', async ({ page }) => {
      await page.goto('/social/facebook');
      
      await expect(page.locator('h1')).toContainText('Facebook');
      await expect(page.getByText(/still in the oven/i)).toBeVisible();
      await expect(page.getByText(/good cookies deserve good company/i)).toBeVisible();
    });

    test('Back button navigates away from social page', async ({ page }) => {
      await page.goto('/social/instagram');
      
      await page.getByRole('link', { name: /back to cookie gallery/i }).click();
      
      // Should navigate away (to home or signin depending on auth)
      await expect(page).not.toHaveURL('/social/instagram');
    });

    test('Cookie animation elements are visible', async ({ page }) => {
      await page.goto('/social/instagram');
      
      // Check for animated cookie text
      await expect(page.getByText(/freshly baking our social presence/i)).toBeVisible();
    });

    test('Social pages scroll to top on load', async ({ page }) => {
      await page.goto('/social/facebook');
      
      await page.waitForLoadState('domcontentloaded');
      
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(0);
    });
  });

  // ============================================
  // Privacy Page - Basic navigation test (no auth needed)
  // ============================================
  
  test.describe('Privacy Page', () => {
    
    test('Privacy page redirects to signin or shows content', async ({ page }) => {
      await page.goto('/privacy');
      
      // Wait for page to load - should either show privacy content or redirect to signin
      await page.waitForLoadState('domcontentloaded');
      
      const url = page.url();
      // Either on privacy page or redirected to signin
      expect(url).toMatch(/(\/privacy|\/signin)/);
    });

    // Note: Additional privacy page tests (scroll position, heading) require auth
    // Set up Firebase Auth Emulator for full coverage
  });

  // Note: Newsletter, Payment Icons, and Footer Social Links tests require auth
  // to access Home page. Set up Firebase Auth Emulator for full coverage.
  // 
  // Future tests to add with auth:
  // - Newsletter form visibility and submission
  // - Payment icons (Visa, Mastercard, RuPay, GPay) visibility  
  // - Footer social links navigation
});
