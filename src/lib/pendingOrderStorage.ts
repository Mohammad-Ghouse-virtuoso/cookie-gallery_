import type { PendingOrderSnapshot, PendingOrderStatus } from '@/types/checkout';

const STORAGE_KEY = 'cg_pending_order_v1';

export function loadPendingOrder(): PendingOrderSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingOrderSnapshot;
    if (!parsed || !parsed.localOrderId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistPendingOrder(snapshot: PendingOrderSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearPendingOrder() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function updatePendingOrderStatus(status: PendingOrderStatus, fields: Partial<PendingOrderSnapshot> = {}) {
  const existing = loadPendingOrder();
  if (!existing) {
    return null;
  }
  const next = {
    ...existing,
    status,
    ...fields,
    updatedAt: Date.now(),
  } as PendingOrderSnapshot & { updatedAt: number };
  persistPendingOrder(next);
  return next;
}
