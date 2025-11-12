import type { CheckoutAddress } from '@/types/checkout';

const STORAGE_KEY = 'cg_checkout_address_v1';

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

export function loadCheckoutAddress(): CheckoutAddress | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function persistCheckoutAddress(address: CheckoutAddress) {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: CheckoutAddress = {
    ...emptyAddress,
    ...address,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearCheckoutAddress() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasCheckoutAddress(): boolean {
  const stored = loadCheckoutAddress();
  if (!stored) {
    return false;
  }
  return Boolean(stored.fullName && stored.phone && stored.line1 && stored.city && stored.postalCode);
}
