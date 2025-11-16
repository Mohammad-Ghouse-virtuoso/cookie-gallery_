import { test, expect, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('cg_e2e_mode', 'true');
  });
});

const addFirstCookieToCart = async (page: Page) => {
  const addButton = page.locator('[data-testid^="add-to-cart-"]').first();
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click();
  const cartBadge = page.locator('[data-testid="cart-count"]');
  await expect(cartBadge).toHaveText('1', { timeout: 5_000 });
  await expect.poll(async () => {
    const stored = await page.evaluate(() => window.sessionStorage.getItem('cg-e2e-cart'));
    return stored ? JSON.parse(stored) : null;
  }).not.toBeNull();
};

const openCartPreview = async (page: Page) => {
  await page.click('[data-testid="cart-button"]');
  await expect(page.locator('[data-testid="cart-modal"]')).toBeVisible({ timeout: 5_000 });
};

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/cookies/);
  });

  test('should add item to cart', async ({ page }) => {
    await addFirstCookieToCart(page);
  });

  test('should navigate to checkout from cart preview', async ({ page }) => {
    await addFirstCookieToCart(page);
    await openCartPreview(page);

    await Promise.all([
      page.waitForURL(/\/checkout/),
      page.locator('[data-testid="cart-preview-checkout"]').click(),
    ]);

    await expect(page).toHaveURL(/\/checkout/);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
  });

  test('should display cart items on checkout page', async ({ page }) => {
    await addFirstCookieToCart(page);
    await Promise.all([
      page.waitForURL(/\/checkout/),
      page.goto('/checkout'),
    ]);
    await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('should allow quantity update in cart preview', async ({ page }) => {
    await addFirstCookieToCart(page);
    await openCartPreview(page);

    const increment = page.locator('[data-testid^="cart-preview-increment-"]').first();
    const quantity = page.locator('[data-testid^="cart-preview-quantity-"]').first();

    await increment.click();
    await expect(quantity).toHaveText('2');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('2');

    await page.click('button[aria-label="Close cart preview"]');
  });

  test('should allow removing items from cart preview', async ({ page }) => {
    await addFirstCookieToCart(page);
    await openCartPreview(page);

    const decrement = page.locator('[data-testid^="cart-preview-decrement-"]').first();
    await decrement.click();

    await expect(page.locator('[data-testid="cart-preview-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-count"]')).toHaveCount(0);

    await page.click('button[aria-label="Close cart preview"]');
  });
});

test.describe('Checkout Process', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/cookies/);
    await addFirstCookieToCart(page);
    await Promise.all([
      page.waitForURL(/\/checkout/),
      page.goto('/checkout'),
    ]);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should display checkout form scaffolding', async ({ page }) => {
    await expect(page.locator('[data-testid="checkout-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();
  });

  test('should display order summary totals', async ({ page }) => {
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-summary"] li').first()).toBeVisible();
    await expect(page.locator('[data-testid="order-summary"]').locator('text=/₹/').first()).toBeVisible();
  });

  test('should surface payment section content', async ({ page }) => {
    const paymentSection = page.locator('[data-testid="payment-section"]');
    await expect(paymentSection.getByRole('heading', { name: /Payment/i })).toBeVisible();
    await expect(paymentSection.locator('text=/Subtotal/i').first()).toBeVisible();
  });
});

test.describe('Order Success', () => {
  test('should display order success page', async ({ page }) => {
    await page.goto('/order-success');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/order-success/);
    await expect(page.locator('text=/success|confirmed|complete|thank you/i').first()).toBeVisible();
  });
});
