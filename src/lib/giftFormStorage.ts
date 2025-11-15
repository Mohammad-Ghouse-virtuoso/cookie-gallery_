import type { GiftAddress } from '@/types/giftExperience';

const STORAGE_PREFIX = 'giftFormStorage:';
const LAST_GIFT_KEY = `${STORAGE_PREFIX}lastGiftId`;

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

function buildStorageKey(giftId: string) {
  const safeId = giftId || 'unknown';
  return `${STORAGE_PREFIX}${safeId}`;
}

export function loadStoredAddress(giftId: string): GiftAddress {
  if (typeof window === 'undefined') {
    return getEmptyAddress();
  }
  try {
    const raw = window.localStorage.getItem(buildStorageKey(giftId));
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

export function persistGiftAddress(giftId: string, address: GiftAddress) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(buildStorageKey(giftId), JSON.stringify(address));
  } catch {
    // Ignore quota failures silently per UX expectations.
  }
}

export function clearGiftAddress(giftId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(buildStorageKey(giftId));
  } catch {
    // Ignore storage removal failures silently.
  }
}

export function getLastGiftId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(LAST_GIFT_KEY);
  } catch {
    return null;
  }
}

export function setLastGiftId(giftId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LAST_GIFT_KEY, giftId);
  } catch {
    // Ignore storage write failures silently.
  }
}

export async function readStoredAddress(giftId: string): Promise<GiftAddress | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  return new Promise(resolve => {
    try {
      const raw = window.localStorage.getItem(buildStorageKey(giftId));
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
