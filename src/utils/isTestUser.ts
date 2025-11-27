/**
 * Test user detection utilities
 * Used to identify users signing in with test phone numbers
 * Test users see session-scoped orders only (not cross-user Firestore history)
 */

// Configured test phone numbers (normalize without spaces)
const TEST_PHONE_NUMBERS = [
  '+918080569613', // Primary test number
  '+15555555555',  // Firebase test number format
];

/**
 * Normalize phone number by removing spaces, dashes, and parentheses
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Check if a phone number is a configured test number
 */
export function isTestPhoneUser(phoneNumber: string | null | undefined): boolean {
  if (!phoneNumber) return false;
  const normalized = normalizePhone(phoneNumber);
  return TEST_PHONE_NUMBERS.some(testNum => normalized === testNum);
}

/**
 * Get the authentication method used by the current user
 */
export function getAuthMethod(user: {
  email?: string | null;
  phoneNumber?: string | null;
  providerData?: Array<{ providerId: string }>;
} | null): 'google' | 'phone' | 'email' | null {
  if (!user) return null;
  
  // Check providerData for actual sign-in method
  const providers = user.providerData ?? [];
  
  for (const provider of providers) {
    if (provider.providerId === 'google.com') return 'google';
    if (provider.providerId === 'phone') return 'phone';
    if (provider.providerId === 'password') return 'email';
  }
  
  // Fallback based on available identifiers
  if (user.phoneNumber && !user.email) return 'phone';
  if (user.email) return 'email';
  
  return null;
}

/**
 * Get display-friendly auth method label
 */
export function getAuthMethodLabel(method: ReturnType<typeof getAuthMethod>): string {
  switch (method) {
    case 'google': return 'Google';
    case 'phone': return 'Phone';
    case 'email': return 'Email';
    default: return 'Unknown';
  }
}
