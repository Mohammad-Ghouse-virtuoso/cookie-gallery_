import { test, expect } from '@playwright/test';

test.describe('Phone Sign-In', () => {
  test.skip('allows signing in with phone number + OTP', async ({ page }) => {
    await page.goto('/signin');

    await page.getByLabel('Phone Number').fill(process.env.E2E_TEST_PHONE_NUMBER!);
    await page.getByRole('button', { name: 'Send Code' }).click();

    await page.getByLabel('Verification Code').fill(process.env.E2E_TEST_PHONE_OTP!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await page.waitForURL('/');
    await expect(page.getByLabel('Sign out from your account')).toBeVisible({ timeout: 15000 });
  });
});
