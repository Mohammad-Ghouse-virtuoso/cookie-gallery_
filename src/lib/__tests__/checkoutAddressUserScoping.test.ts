/**
 * Tests for checkout address storage with user scoping
 * 
 * Key requirement: Addresses are scoped to user UID
 * - Bangalore user's address should NOT appear for Hyderabad user
 * - Each user sees their own saved address
 * - Newly updated addresses appear on next order
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadCheckoutAddress,
  persistCheckoutAddress,
  clearCheckoutAddress,
  hasCheckoutAddress,
  getEmptyCheckoutAddress,
} from '../checkoutAddressStorage';
import type { CheckoutAddress } from '@/types/checkout';

describe('checkoutAddressStorage - User Scoping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const bangaloreAddress: CheckoutAddress = {
    fullName: 'Ravi Kumar',
    phone: '+91 9876543210',
    email: 'ravi@example.com',
    line1: '123 MG Road',
    line2: 'Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560038',
    country: 'India',
  };

  const hyderabadAddress: CheckoutAddress = {
    fullName: 'Priya Sharma',
    phone: '+91 9123456780',
    email: 'priya@example.com',
    line1: '456 Banjara Hills',
    line2: 'Road No. 12',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500034',
    country: 'India',
  };

  const USER_A_UID = 'user-bangalore-123';
  const USER_B_UID = 'user-hyderabad-456';

  it('stores addresses scoped to user UID', () => {
    // User A (Bangalore) saves their address
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);
    
    // User B (Hyderabad) saves their address
    persistCheckoutAddress(hyderabadAddress, USER_B_UID);

    // Verify each user sees only their own address
    const userAAddress = loadCheckoutAddress(USER_A_UID);
    const userBAddress = loadCheckoutAddress(USER_B_UID);

    expect(userAAddress?.city).toBe('Bangalore');
    expect(userAAddress?.fullName).toBe('Ravi Kumar');
    
    expect(userBAddress?.city).toBe('Hyderabad');
    expect(userBAddress?.fullName).toBe('Priya Sharma');
  });

  it('does NOT show Bangalore address to Hyderabad user', () => {
    // User A saves Bangalore address
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);

    // User B should see null (no address saved for them)
    const userBAddress = loadCheckoutAddress(USER_B_UID);
    expect(userBAddress).toBeNull();

    // Verify Bangalore address exists for correct user
    const userAAddress = loadCheckoutAddress(USER_A_UID);
    expect(userAAddress?.city).toBe('Bangalore');
  });

  it('updated address appears on next order (simulated)', () => {
    // Initial address for User A
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);
    
    // Verify initial address
    let savedAddress = loadCheckoutAddress(USER_A_UID);
    expect(savedAddress?.line1).toBe('123 MG Road');

    // User A updates their address (simulating "Edit" on Orders page)
    const updatedAddress: CheckoutAddress = {
      ...bangaloreAddress,
      line1: '789 Koramangala',
      line2: '5th Block',
      postalCode: '560095',
    };
    persistCheckoutAddress(updatedAddress, USER_A_UID);

    // On next order, user should see updated address
    savedAddress = loadCheckoutAddress(USER_A_UID);
    expect(savedAddress?.line1).toBe('789 Koramangala');
    expect(savedAddress?.line2).toBe('5th Block');
    expect(savedAddress?.postalCode).toBe('560095');
    
    // City unchanged
    expect(savedAddress?.city).toBe('Bangalore');
  });

  it('previous address is fully replaced on update', () => {
    // Save initial address
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);

    // Completely new address (moved to different city)
    const newAddress: CheckoutAddress = {
      fullName: 'Ravi Kumar',
      phone: '+91 9876543210',
      email: 'ravi.new@example.com',
      line1: '100 Marine Drive',
      line2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400002',
      country: 'India',
    };
    persistCheckoutAddress(newAddress, USER_A_UID);

    // Verify old address is completely gone
    const savedAddress = loadCheckoutAddress(USER_A_UID);
    expect(savedAddress?.city).toBe('Mumbai');
    expect(savedAddress?.state).toBe('Maharashtra');
    expect(savedAddress?.line1).toBe('100 Marine Drive');
    // Old Bangalore references should be gone
    expect(savedAddress?.city).not.toBe('Bangalore');
  });

  it('hasCheckoutAddress returns true only when address is complete', () => {
    // No address saved
    expect(hasCheckoutAddress(USER_A_UID)).toBe(false);

    // Incomplete address (missing required fields)
    const incompleteAddress = getEmptyCheckoutAddress();
    incompleteAddress.fullName = 'Test';
    persistCheckoutAddress(incompleteAddress, USER_A_UID);
    expect(hasCheckoutAddress(USER_A_UID)).toBe(false);

    // Complete address
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);
    expect(hasCheckoutAddress(USER_A_UID)).toBe(true);
  });

  it('clearCheckoutAddress only clears for specified user', () => {
    // Both users have addresses
    persistCheckoutAddress(bangaloreAddress, USER_A_UID);
    persistCheckoutAddress(hyderabadAddress, USER_B_UID);

    // Clear User A's address
    clearCheckoutAddress(USER_A_UID);

    // User A should have no address
    expect(loadCheckoutAddress(USER_A_UID)).toBeNull();

    // User B should still have their address
    const userBAddress = loadCheckoutAddress(USER_B_UID);
    expect(userBAddress?.city).toBe('Hyderabad');
  });

  it('test phone users with same number get isolated addresses via UID', () => {
    // Even if phone number is same (test number), UIDs are different
    // Firebase creates unique UID per auth session
    const TEST_USER_SESSION_1 = 'test-session-uid-111';
    const TEST_USER_SESSION_2 = 'test-session-uid-222';

    persistCheckoutAddress(bangaloreAddress, TEST_USER_SESSION_1);
    persistCheckoutAddress(hyderabadAddress, TEST_USER_SESSION_2);

    // Each session should see only their address
    expect(loadCheckoutAddress(TEST_USER_SESSION_1)?.city).toBe('Bangalore');
    expect(loadCheckoutAddress(TEST_USER_SESSION_2)?.city).toBe('Hyderabad');
  });
});
