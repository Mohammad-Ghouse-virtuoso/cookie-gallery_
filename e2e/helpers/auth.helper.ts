import { Page } from '@playwright/test';

/**
 * Authentication helper for E2E tests
 * 
 * Note: For E2E tests, we'll use the actual sign-in flow.
 * In a production test environment, you might want to use Firebase Auth Emulator
 * or create test users with known credentials.
 */

export async function signInWithGoogle(page: Page): Promise<void> {
  // Navigate to sign-in page
  await page.goto('/signin');
  
  // Wait for the Google sign-in button to be visible
  await page.waitForSelector('button:has-text("Sign in with Google")', { timeout: 10000 });
  
  // Note: For full E2E tests with Google OAuth, you would need:
  // 1. Test credentials for a Google account
  // 2. Handle OAuth redirect flow
  // 3. Or use Firebase Auth Emulator
  
  // For now, we'll document that this requires proper test credentials
  console.log('Google sign-in requires test credentials or Firebase Auth Emulator');
}

/**
 * Check if user is already authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check if we're redirected away from signin or if user elements are present
    const currentUrl = page.url();
    return !currentUrl.includes('/signin') && !currentUrl.includes('/signed-out');
  } catch {
    return false;
  }
}

/**
 * Mock authentication by setting localStorage/sessionStorage
 * This is a workaround for testing without actual OAuth flow
 */
export async function mockAuthentication(page: Page): Promise<void> {
  // Note: This is a simplified approach. In production, you'd want to:
  // 1. Use Firebase Auth Emulator
  // 2. Create a custom auth endpoint for tests
  // 3. Or use actual test credentials
  
  await page.goto('/');
  
  // For now, we'll document that proper auth setup is needed
  console.log('Mock authentication - requires proper Firebase Auth Emulator setup');
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page): Promise<void> {
  await page.goto('/signed-out');
}
