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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('cg_e2e_mode', 'true');
  });
});

test.describe('Cookie Catalogue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/cookies/);
  });

  test('should display cookie items', async ({ page }) => {
    const cookieItems = page.locator('[data-testid="cookie-item"]');
    await expect(cookieItems.first()).toBeVisible({ timeout: 10000 });
    expect(await cookieItems.count()).toBeGreaterThan(0);
  });

  test('should display product images', async ({ page }) => {
    const images = page.locator('[data-testid="cookie-item"] img');
    await expect(images.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display product prices', async ({ page }) => {
    const prices = page.locator('[data-testid="cookie-item"]').locator('text=/₹/');
    expect(await prices.count()).toBeGreaterThan(0);
  });

  test('should have add to cart controls', async ({ page }) => {
    const addButtons = page.locator('[data-testid^="add-to-cart-"]');
    await expect(addButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await addButtons.count()).toBeGreaterThan(0);
  });
});

test.describe('Product Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/cookies/);
  });

  test('should navigate to product detail page when clicking on product', async ({ page }) => {
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await expect(viewDetailsButton).toBeVisible({ timeout: 10000 });

    await Promise.all([
      page.waitForURL(/\/product\//),
      viewDetailsButton.click(),
    ]);

    await expect(page.locator('h1, h2, [data-testid="product-title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display product details on detail page', async ({ page }) => {
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await viewDetailsButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="product-title"], h1, h2').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Ingredients & Nutrition/i })).toBeVisible();
  });
});

test.describe('Search and Filter', () => {
  test('should expose search and filter controls', async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#cookie-search')).toBeVisible();
    // At least one dietary filter button should be present
    await expect(page.locator('[aria-label$="filter"]').first()).toBeVisible();
  });
});
