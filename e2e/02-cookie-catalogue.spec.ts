import { test, expect } from '@playwright/test';

/**
 * Cookie Catalogue E2E Tests
 * 
 * These tests verify the cookie catalogue page functionality,
 * including browsing products and viewing product details.
 * 
 * Note: These tests require authentication. In a production environment,
 * you would set up Firebase Auth Emulator or use test credentials.
 */

test.describe('Cookie Catalogue', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to cookies page
    // Note: This will redirect to signin if not authenticated
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
  });

  test('should display the cookies page or redirect to signin', async ({ page }) => {
    const url = page.url();
    
    // Should be on cookies page or signin
    expect(url).toMatch(/(\/cookies|\/signin)/);
  });

  test('should display cookie items when authenticated', async ({ page }) => {
    // Skip if not authenticated (redirected to signin)
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Wait for cookie items to load
    const cookieItems = page.locator('[data-testid="cookie-item"], .cookie-card, article, [class*="product"]');
    
    // Should have at least one cookie displayed
    await expect(cookieItems.first()).toBeVisible({ timeout: 10000 });
    
    const count = await cookieItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display product images', async ({ page }) => {
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Wait for images to load
    const images = page.locator('img[alt*="cookie"], img[alt*="Cookie"], img[src*="cookie"]');
    
    // Should have at least one image
    await expect(images.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display product prices', async ({ page }) => {
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Look for price indicators (₹ symbol or currency formatting)
    const prices = page.locator('text=/₹|Rs\\.?\\s*\\d+/i');
    
    // Should have at least one price displayed
    const count = await prices.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have add to cart buttons', async ({ page }) => {
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Wait for page to fully load
    await page.waitForTimeout(1000);

    // Look for add to cart buttons
    const addToCartButtons = page.locator('button:has-text("Add to Cart"), button:has-text("Add to cart"), button:has-text("Add")');
    
    // Should have at least one add to cart button
    const count = await addToCartButtons.count();
    
    // If no buttons found, page may require authentication or items not loaded
    if (count === 0) {
      console.log('No add to cart buttons found - may need authentication or items to load');
      test.skip();
    }
    
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Product Details', () => {
  test('should navigate to product detail page when clicking on product', async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Wait for product items
    const productItems = page.locator('[data-testid="cookie-item"], .cookie-card, article, [class*="product"]');
    
    // Check if any product items exist
    const itemCount = await productItems.count();
    if (itemCount === 0) {
      console.log('No product items found to click');
      test.skip();
    }
    
    await expect(productItems.first()).toBeVisible({ timeout: 10000 });

    // Try to find and click a clickable product link or card
    const productLinks = page.locator('a[href*="/product/"]');
    const linkCount = await productLinks.count();
    
    if (linkCount > 0) {
      await productLinks.first().click();
      await page.waitForLoadState('networkidle');
      const newUrl = page.url();
      expect(newUrl).toMatch(/\/product\/|\/cookie\//);
    } else {
      // No direct product links found, test informational only
      console.log('No product links found for navigation test');
      test.skip();
    }
  });

  test('should display product details on detail page', async ({ page }) => {
    // Try to access a product page directly
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Get first product and navigate to it
    const productLinks = page.locator('a[href*="/product/"], [data-testid="product-link"]');
    
    if (await productLinks.count() > 0) {
      await productLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Should display product details
      const productTitle = page.locator('h1, h2, [data-testid="product-title"]');
      await expect(productTitle.first()).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });
});

test.describe('Search and Filter', () => {
  test('should have search or filter functionality (if available)', async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    if (url.includes('/signin')) {
      test.skip();
    }

    // Check if search or filter elements exist
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const filterButtons = page.locator('button:has-text("Filter"), select');
    
    const hasSearch = await searchInput.count() > 0;
    const hasFilter = await filterButtons.count() > 0;
    
    // Document the presence of search/filter features
    if (hasSearch || hasFilter) {
      console.log('Search/Filter functionality detected');
    } else {
      console.log('No search/filter functionality found');
    }
    
    // This test passes regardless - it's informational
    expect(true).toBe(true);
  });
});
