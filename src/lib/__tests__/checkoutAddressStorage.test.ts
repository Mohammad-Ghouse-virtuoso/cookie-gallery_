import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import {
  loadCheckoutAddress,
  persistCheckoutAddress,
  clearCheckoutAddress,
  getEmptyCheckoutAddress,
  hasCheckoutAddress,
} from '../checkoutAddressStorage';
import type { CheckoutAddress } from '@/types/checkout';

describe('checkoutAddressStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('getEmptyCheckoutAddress returns empty address with India as default', () => {
    const empty = getEmptyCheckoutAddress();
    expect(empty.fullName).toBe('');
    expect(empty.phone).toBe('');
    expect(empty.line1).toBe('');
    expect(empty.line2).toBe('');
    expect(empty.city).toBe('');
    expect(empty.state).toBe('');
    expect(empty.postalCode).toBe('');
    expect(empty.country).toBe('India');
  });

  test('loadCheckoutAddress returns null when no address exists', () => {
    expect(loadCheckoutAddress()).toBeNull();
  });

  test('persistCheckoutAddress stores address in localStorage', () => {
    const address: CheckoutAddress = {
      fullName: 'John Doe',
      phone: '+919876543210',
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    persistCheckoutAddress(address);
    const loaded = loadCheckoutAddress();

    expect(loaded).toEqual(address);
  });

  test('clearCheckoutAddress removes address from localStorage', () => {
    const address: CheckoutAddress = {
      fullName: 'Jane Doe',
      phone: '+919876543210',
      line1: '456 Oak St',
      line2: '',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    };

    persistCheckoutAddress(address);
    expect(loadCheckoutAddress()).not.toBeNull();

    clearCheckoutAddress();
    expect(loadCheckoutAddress()).toBeNull();
  });

  test('hasCheckoutAddress returns false when no address exists', () => {
    expect(hasCheckoutAddress()).toBe(false);
  });

  test('hasCheckoutAddress returns false for incomplete address', () => {
    const incomplete: CheckoutAddress = {
      fullName: 'John Doe',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    };

    persistCheckoutAddress(incomplete);
    expect(hasCheckoutAddress()).toBe(false);
  });

  test('hasCheckoutAddress returns true for complete address', () => {
    const complete: CheckoutAddress = {
      fullName: 'John Doe',
      phone: '+919876543210',
      line1: '123 Main St',
      line2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    persistCheckoutAddress(complete);
    expect(hasCheckoutAddress()).toBe(true);
  });

  test('supports user-scoped storage', () => {
    const address1: CheckoutAddress = {
      fullName: 'User One',
      phone: '+919876543210',
      line1: '123 St',
      line2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    const address2: CheckoutAddress = {
      fullName: 'User Two',
      phone: '+919876543211',
      line1: '456 St',
      line2: '',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    };

    persistCheckoutAddress(address1, 'user1@example.com');
    persistCheckoutAddress(address2, 'user2@example.com');

    const loaded1 = loadCheckoutAddress('user1@example.com');
    const loaded2 = loadCheckoutAddress('user2@example.com');

    expect(loaded1?.fullName).toBe('User One');
    expect(loaded2?.fullName).toBe('User Two');
  });

  test('clearCheckoutAddress with ownerId only clears specific user address', () => {
    const address1: CheckoutAddress = {
      fullName: 'User One',
      phone: '+919876543210',
      line1: '123 St',
      line2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    const address2: CheckoutAddress = {
      fullName: 'User Two',
      phone: '+919876543211',
      line1: '456 St',
      line2: '',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    };

    persistCheckoutAddress(address1, 'user1@example.com');
    persistCheckoutAddress(address2, 'user2@example.com');

    clearCheckoutAddress('user1@example.com');

    expect(loadCheckoutAddress('user1@example.com')).toBeNull();
    expect(loadCheckoutAddress('user2@example.com')).not.toBeNull();
  });

  test('migrates legacy storage to user-scoped storage', () => {
    const legacyAddress: CheckoutAddress = {
      fullName: 'Legacy User',
      phone: '+919876543210',
      line1: '789 Legacy St',
      line2: '',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    };

    localStorage.setItem('cg_checkout_address_v1', JSON.stringify(legacyAddress));

    const loaded = loadCheckoutAddress('user@example.com');
    expect(loaded?.fullName).toBe('Legacy User');
    expect(localStorage.getItem('cg_checkout_address_v1')).toBeNull();
  });

  test('handles malformed data gracefully', () => {
    localStorage.setItem('cg_checkout_address_v1', 'invalid-json');
    expect(loadCheckoutAddress()).toBeNull();
  });

  test('merges partial address with empty defaults', () => {
    const partial = {
      fullName: 'Partial User',
      city: 'Chennai',
    };

    localStorage.setItem('cg_checkout_address_v1', JSON.stringify(partial));
    const loaded = loadCheckoutAddress();

    expect(loaded?.fullName).toBe('Partial User');
    expect(loaded?.city).toBe('Chennai');
    expect(loaded?.country).toBe('India');
    expect(loaded?.phone).toBe('');
  });
});
