import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing Suite
 * 
 * Uses Playwright's built-in screenshot comparison to detect unintended UI changes.
 * Baseline screenshots are stored in e2e/__screenshots__/ directory.
 * 
 * To update baselines after intentional changes:
 *   npx playwright test --update-snapshots
 */

test.describe('Visual Regression Tests', () => {
  
  test.describe('Homepage Visual Tests', () => {
    test.skip('homepage hero section matches baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for hero section to load
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // Wait for images to load
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 1000)); // Extra stability time
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('homepage-full.png', {
        fullPage: true,
        maxDiffPixels: 500, // Allow for carousel animations
        timeout: 30000,
      });
    });

    test.skip('homepage hero section (above fold)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Screenshot viewport only (above the fold)
      await expect(page).toHaveScreenshot('homepage-hero.png', {
        maxDiffPixels: 200,
        timeout: 15000,
      });
    });

    test('bestseller carousel matches baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for bestsellers to load
      const bestsellerSection = page.locator('text=Best Sellers').locator('..').locator('..');
      await bestsellerSection.waitFor({ state: 'visible', timeout: 10000 });
      
      await expect(bestsellerSection).toHaveScreenshot('bestseller-carousel.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Navigation Visual Tests', () => {
    test('navigation bar matches baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for nav to be visible
      const nav = page.locator('nav');
      await nav.waitFor({ state: 'visible', timeout: 10000 });
      
      await expect(nav).toHaveScreenshot('navbar.png', {
        maxDiffPixels: 30,
      });
    });

    test('navigation hover state', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Hover over first nav link
      const navLink = page.locator('nav a').first();
      await navLink.waitFor({ state: 'visible', timeout: 10000 });
      await navLink.hover();
      
      const nav = page.locator('nav');
      await expect(nav).toHaveScreenshot('navbar-hover.png', {
        maxDiffPixels: 50,
      });
    });
  });

  test.describe('Cookie Catalogue Visual Tests', () => {
    test('cookie catalogue full page', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for cookie cards to load
      await page.waitForSelector('h1:has-text("Cookie Catalogue")', { timeout: 10000 });
      
      await expect(page).toHaveScreenshot('catalogue-full.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test.skip('cookie card layout', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for first cookie card and image to load
      const cookieCard = page.locator('[data-testid="cookie-card"]').first();
      await cookieCard.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await expect(cookieCard).toHaveScreenshot('cookie-card.png', {
        maxDiffPixels: 100,
        timeout: 10000,
      });
    });

    test('search and filter section', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      
      // Screenshot the header with search and filters
      const header = page.locator('header').first();
      await header.waitFor({ state: 'visible', timeout: 10000 });
      
      await expect(header).toHaveScreenshot('catalogue-header.png', {
        maxDiffPixels: 50,
      });
    });

    test.skip('cookie modal appearance', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      
      // Open first cookie modal
      const cookieCard = page.locator('[data-testid="cookie-card"]').first();
      await cookieCard.waitFor({ state: 'visible', timeout: 10000 });
      await cookieCard.click();
      
      // Wait for modal
      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      
      await expect(modal).toHaveScreenshot('cookie-modal.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Sign-In Page Visual Tests', () => {
    test('sign-in page matches baseline', async ({ page }) => {
      await page.goto('/signin');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for sign-in form
      await page.waitForSelector('form, button', { timeout: 10000 });
      
      await expect(page).toHaveScreenshot('signin-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Mobile Visual Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test.skip('mobile homepage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('mobile-homepage.png', {
        fullPage: true,
        maxDiffPixels: 500,
        timeout: 30000,
      });
    });

    test('mobile navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const nav = page.locator('nav');
      await nav.waitFor({ state: 'visible', timeout: 10000 });
      
      await expect(nav).toHaveScreenshot('mobile-navbar.png', {
        maxDiffPixels: 50,
      });
    });

    test('mobile cookie catalogue', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1:has-text("Cookie Catalogue")', { timeout: 10000 });
      
      await expect(page).toHaveScreenshot('mobile-catalogue.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test.skip('mobile cookie card', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      
      const cookieCard = page.locator('[data-testid="cookie-card"]').first();
      await cookieCard.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
      
      await expect(cookieCard).toHaveScreenshot('mobile-cookie-card.png', {
        maxDiffPixels: 100,
        timeout: 10000,
      });
    });
  });

  test.describe('Tablet Visual Tests', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad

    test.skip('tablet homepage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1', { timeout: 10000 });
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('tablet-homepage.png', {
        fullPage: true,
        maxDiffPixels: 500,
        timeout: 30000,
      });
    });

    test('tablet cookie catalogue', async ({ page }) => {
      await page.goto('/cookies');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1:has-text("Cookie Catalogue")', { timeout: 10000 });
      
      await expect(page).toHaveScreenshot('tablet-catalogue.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe('Interactive State Visual Tests', () => {
    test('button hover states', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Find a button and hover
      const button = page.locator('button').first();
      await button.waitFor({ state: 'visible', timeout: 10000 });
      await button.hover();
      
      await expect(button).toHaveScreenshot('button-hover.png', {
        maxDiffPixels: 30,
      });
    });

    test('link hover states', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      const link = page.locator('a').first();
      await link.waitFor({ state: 'visible', timeout: 10000 });
      await link.hover();
      
      await expect(link).toHaveScreenshot('link-hover.png', {
        maxDiffPixels: 30,
      });
    });
  });

  test.describe('Footer Visual Tests', () => {
    test('footer matches baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Scroll to footer
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await footer.waitFor({ state: 'visible', timeout: 10000 });
      
      await expect(footer).toHaveScreenshot('footer.png', {
        maxDiffPixels: 50,
      });
    });
  });
});
