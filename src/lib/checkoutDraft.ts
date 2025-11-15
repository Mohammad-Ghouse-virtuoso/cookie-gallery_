import type { CheckoutAddress } from '@/types/checkout';

type CheckoutDraftPayload = {
  address: Partial<CheckoutAddress>;
  savedAt: number;
};

const DRAFT_KEY_BASE = 'checkoutDraft';

const LEGACY_KEYS = [DRAFT_KEY_BASE];

function resolveDraftKey(ownerId?: string | null) {
  if (!ownerId) {
    return DRAFT_KEY_BASE;
  }
  return `${DRAFT_KEY_BASE}:${ownerId.toLowerCase()}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadCheckoutDraft(ownerId?: string | null): CheckoutDraftPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const storage = window.localStorage;
    const activeKey = resolveDraftKey(ownerId);
    let raw = storage.getItem(activeKey);

    if (!raw && ownerId) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = storage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          storage.setItem(activeKey, legacyRaw);
          storage.removeItem(legacyKey);
          break;
        }
      }
    }

    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CheckoutDraftPayload> | null;
    if (!parsed || !isPlainObject(parsed)) {
      return null;
    }
    if (!isPlainObject(parsed.address)) {
      return null;
    }
    const address = parsed.address as Partial<CheckoutAddress>;
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now();
    return { address, savedAt };
  } catch {
    return null;
  }
}

export function persistCheckoutDraft(address: Partial<CheckoutAddress>, ownerId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: CheckoutDraftPayload = {
    address: { ...address },
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(resolveDraftKey(ownerId), JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function clearCheckoutDraft(ownerId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(resolveDraftKey(ownerId));
}
