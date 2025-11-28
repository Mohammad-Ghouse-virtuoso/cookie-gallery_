import { describe, expect, test } from 'vitest';
import {
  isTestPhoneUser,
  getAuthMethod,
  getAuthMethodLabel,
} from '../isTestUser';

describe('isTestUser utilities', () => {
  describe('isTestPhoneUser', () => {
    test('returns false for null phone number', () => {
      expect(isTestPhoneUser(null)).toBe(false);
    });

    test('returns false for undefined phone number', () => {
      expect(isTestPhoneUser(undefined)).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(isTestPhoneUser('')).toBe(false);
    });

    test('returns true for primary test number (+918080569613)', () => {
      expect(isTestPhoneUser('+918080569613')).toBe(true);
    });

    test('returns true for test number with spaces', () => {
      expect(isTestPhoneUser('+91 80805 69613')).toBe(true);
    });

    test('returns true for test number with dashes', () => {
      expect(isTestPhoneUser('+91-8080-569613')).toBe(true);
    });

    test('returns true for Firebase test number (+15555555555)', () => {
      expect(isTestPhoneUser('+15555555555')).toBe(true);
    });

    test('returns false for regular phone numbers', () => {
      expect(isTestPhoneUser('+919876543210')).toBe(false);
      expect(isTestPhoneUser('+14155551234')).toBe(false);
      expect(isTestPhoneUser('+918074158363')).toBe(false);
    });

    test('handles phone with parentheses', () => {
      expect(isTestPhoneUser('+91 (8080) 569613')).toBe(true);
    });
  });

  describe('getAuthMethod', () => {
    test('returns null for null user', () => {
      expect(getAuthMethod(null)).toBeNull();
    });

    test('returns google for user with Google provider', () => {
      const user = {
        email: 'user@gmail.com',
        providerData: [{ providerId: 'google.com' }],
      };
      expect(getAuthMethod(user)).toBe('google');
    });

    test('returns phone for user with phone provider', () => {
      const user = {
        phoneNumber: '+919876543210',
        providerData: [{ providerId: 'phone' }],
      };
      expect(getAuthMethod(user)).toBe('phone');
    });

    test('returns email for user with password provider', () => {
      const user = {
        email: 'user@example.com',
        providerData: [{ providerId: 'password' }],
      };
      expect(getAuthMethod(user)).toBe('email');
    });

    test('falls back to phone when only phoneNumber is present', () => {
      const user = {
        phoneNumber: '+919876543210',
        providerData: [],
      };
      expect(getAuthMethod(user)).toBe('phone');
    });

    test('falls back to email when only email is present', () => {
      const user = {
        email: 'user@example.com',
        providerData: [],
      };
      expect(getAuthMethod(user)).toBe('email');
    });

    test('returns null when no identifiers present', () => {
      const user = {
        providerData: [],
      };
      expect(getAuthMethod(user)).toBeNull();
    });

    test('handles undefined providerData', () => {
      const user = {
        email: 'test@example.com',
      };
      expect(getAuthMethod(user)).toBe('email');
    });

    test('prioritizes providerData over fallback identifiers', () => {
      // User has email but logged in via phone
      const user = {
        email: 'linked@example.com',
        phoneNumber: '+919876543210',
        providerData: [{ providerId: 'phone' }],
      };
      expect(getAuthMethod(user)).toBe('phone');
    });

    test('handles multiple providers (returns first match)', () => {
      const user = {
        email: 'user@example.com',
        providerData: [
          { providerId: 'google.com' },
          { providerId: 'password' },
        ],
      };
      expect(getAuthMethod(user)).toBe('google');
    });
  });

  describe('getAuthMethodLabel', () => {
    test('returns "Google" for google method', () => {
      expect(getAuthMethodLabel('google')).toBe('Google');
    });

    test('returns "Phone" for phone method', () => {
      expect(getAuthMethodLabel('phone')).toBe('Phone');
    });

    test('returns "Email" for email method', () => {
      expect(getAuthMethodLabel('email')).toBe('Email');
    });

    test('returns "Unknown" for null method', () => {
      expect(getAuthMethodLabel(null)).toBe('Unknown');
    });
  });

  describe('integration: test user detection flow', () => {
    test('correctly identifies Google user as non-test user', () => {
      const googleUser = {
        email: 'regular@gmail.com',
        providerData: [{ providerId: 'google.com' }],
      };
      
      expect(isTestPhoneUser(null)).toBe(false);
      expect(getAuthMethod(googleUser)).toBe('google');
    });

    test('correctly identifies test phone user', () => {
      const testPhoneUser = {
        phoneNumber: '+918080569613',
        providerData: [{ providerId: 'phone' }],
      };
      
      expect(isTestPhoneUser(testPhoneUser.phoneNumber)).toBe(true);
      expect(getAuthMethod(testPhoneUser)).toBe('phone');
    });

    test('correctly identifies regular phone user as non-test', () => {
      const regularPhoneUser = {
        phoneNumber: '+919876543210',
        providerData: [{ providerId: 'phone' }],
      };
      
      expect(isTestPhoneUser(regularPhoneUser.phoneNumber)).toBe(false);
      expect(getAuthMethod(regularPhoneUser)).toBe('phone');
    });
  });
});
