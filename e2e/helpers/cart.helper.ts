import { Page } from '@playwright/test';

/**
 * Cart helper functions for E2E tests
 */

/**
 * Add an item to cart from the catalogue page
 */
export async function addItemToCart(page: Page, itemIndex: number = 0): Promise<void> {
  // Wait for catalogue items to load
  await page.waitForSelector('[data-testid="cookie-item"], .cookie-card, [class*="cookie"]', { timeout: 10000 });
  
  // Find all add to cart buttons
  const addToCartButtons = page.locator('button:has-text("Add to Cart"), button:has-text("Add to cart")');
  
  // Click the specified item's add to cart button
  await addToCartButtons.nth(itemIndex).click();
  
  // Wait a bit for cart to update
  await page.waitForTimeout(500);
}

/**
 * Navigate to cart/checkout
 */
export async function goToCart(page: Page): Promise<void> {
  // Look for cart icon or checkout button
  const cartButton = page.locator('[data-testid="cart-button"], button:has-text("Cart"), a[href*="checkout"]').first();
  await cartButton.click();
  
  // Wait for navigation
  await page.waitForLoadState('networkidle');
}

/**
 * Get cart item count
 */
export async function getCartItemCount(page: Page): Promise<number> {
  try {
    const cartBadge = page.locator('[data-testid="cart-count"], .cart-badge, [class*="cart-count"]').first();
    const text = await cartBadge.textContent();
    return parseInt(text || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Remove item from cart
 */
export async function removeItemFromCart(page: Page, itemIndex: number = 0): Promise<void> {
  const removeButtons = page.locator('button:has-text("Remove"), button[aria-label*="remove"]');
  await removeButtons.nth(itemIndex).click();
  await page.waitForTimeout(500);
}

/**
 * Update item quantity in cart
 */
export async function updateCartItemQuantity(page: Page, itemIndex: number, quantity: number): Promise<void> {
  // Find quantity input for the item
  const quantityInputs = page.locator('input[type="number"], input[aria-label*="quantity"]');
  const input = quantityInputs.nth(itemIndex);
  
  await input.clear();
  await input.fill(quantity.toString());
  await page.waitForTimeout(500);
}
