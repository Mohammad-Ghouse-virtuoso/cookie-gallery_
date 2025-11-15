import type { CheckoutAddress } from '@/types/checkout';

const STORAGE_KEY_BASE = 'cg_checkout_address_v1';
const LEGACY_STORAGE_KEY = STORAGE_KEY_BASE;

const emptyAddress: CheckoutAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

export function getEmptyCheckoutAddress(): CheckoutAddress {
  return { ...emptyAddress };
}

function resolveKey(ownerId?: string | null) {
  if (!ownerId) {
    return STORAGE_KEY_BASE;
  }
  return `${STORAGE_KEY_BASE}:${ownerId.toLowerCase()}`;
}

export function loadCheckoutAddress(ownerId?: string | null): CheckoutAddress | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const storage = window.localStorage;
    const activeKey = resolveKey(ownerId);
    let raw = storage.getItem(activeKey);

    if (!raw && ownerId) {
      // Attempt to migrate any legacy value that was stored without user scoping.
      raw = storage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        storage.setItem(activeKey, raw);
        storage.removeItem(LEGACY_STORAGE_KEY);
      }
    }

    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CheckoutAddress> | null;
    if (!parsed) {
      return null;
    }
    return {
      ...emptyAddress,
      ...parsed,
    };
  } catch {
    return null;
  }
}

export function persistCheckoutAddress(address: CheckoutAddress, ownerId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: CheckoutAddress = {
    ...emptyAddress,
    ...address,
  };
  window.localStorage.setItem(resolveKey(ownerId), JSON.stringify(payload));
}

export function clearCheckoutAddress(ownerId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(resolveKey(ownerId));
}

export function hasCheckoutAddress(ownerId?: string | null): boolean {
  const stored = loadCheckoutAddress(ownerId);
  if (!stored) {
    return false;
  }
  return Boolean(stored.fullName && stored.phone && stored.line1 && stored.city && stored.postalCode);
}
