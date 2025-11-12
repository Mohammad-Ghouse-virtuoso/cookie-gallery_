import type { GiftAddress } from '@/types/giftExperience';

const STORAGE_KEY = 'cg_gift_address';

const emptyAddress: GiftAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  pincode: '',
  landmark: '',
};

export function getEmptyAddress(): GiftAddress {
  return { ...emptyAddress };
}

export function loadStoredAddress(): GiftAddress {
  if (typeof window === 'undefined') {
    return getEmptyAddress();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getEmptyAddress();
    }
    const parsed = JSON.parse(raw) as Partial<GiftAddress> | null;
    return {
      ...emptyAddress,
      ...(parsed || {}),
    };
  } catch {
    return getEmptyAddress();
  }
}

export function persistGiftAddress(address: GiftAddress) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  } catch {
    // Ignore quota failures silently per UX expectations.
  }
}

export async function readStoredAddress(): Promise<GiftAddress | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  return new Promise(resolve => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        resolve(null);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<GiftAddress> | null;
      resolve({
        ...emptyAddress,
        ...(parsed || {}),
      });
    } catch {
      resolve(null);
    }
  });
}
