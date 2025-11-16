import { Page } from '@playwright/test';

/**
 * Cart helper functions for E2E tests
 */

/**
 * Add an item to cart from the catalogue page
 */
export async function addItemToCart(page: Page, itemIndex: number = 0): Promise<void> {
  await page.waitForSelector('[data-testid="cookie-item"]', { timeout: 10000 });
  const addToCartButtons = page.locator('[data-testid^="add-to-cart-"]');
  await addToCartButtons.nth(itemIndex).click();
  await page.waitForTimeout(300);
}

/**
 * Navigate to cart/checkout
 */
export async function goToCart(page: Page): Promise<void> {
  await page.locator('[data-testid="cart-button"]').click();
  await page.locator('[data-testid="cart-modal"]').waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Get cart item count
 */
export async function getCartItemCount(page: Page): Promise<number> {
  const cartBadge = page.locator('[data-testid="cart-count"]');
  if (await cartBadge.count()) {
    const text = await cartBadge.first().textContent();
    return parseInt(text || '0', 10);
  }
  return 0;
}

/**
 * Remove item from cart
 */
export async function removeItemFromCart(page: Page, itemIndex: number = 0): Promise<void> {
  const decrementButtons = page.locator('[data-testid^="cart-preview-decrement-"]');
  await decrementButtons.nth(itemIndex).click();
  await page.waitForTimeout(300);
}

/**
 * Update item quantity in cart
 */
export async function updateCartItemQuantity(page: Page, itemIndex: number, quantity: number): Promise<void> {
  const currentQuantityLocator = page.locator('[data-testid^="cart-preview-quantity-"]').nth(itemIndex);
  const incrementButtons = page.locator('[data-testid^="cart-preview-increment-"]').nth(itemIndex);
  const decrementButtons = page.locator('[data-testid^="cart-preview-decrement-"]').nth(itemIndex);

  const current = parseInt(await currentQuantityLocator.textContent() || '0', 10);
  const diff = quantity - current;

  if (diff > 0) {
    for (let i = 0; i < diff; i += 1) {
      await incrementButtons.click();
    }
  } else if (diff < 0) {
    for (let i = 0; i < Math.abs(diff); i += 1) {
      await decrementButtons.click();
    }
  }

  await page.waitForTimeout(300);
}
