import type { PendingOrderSnapshot, PendingOrderStatus } from '@/types/checkout';

const CURRENT_KEY = 'pendingOrder:current';
const LEGACY_KEY = 'cg_pending_order_v1';

function orderStorageKey(orderId: string) {
  return `pendingOrder:${orderId}`;
}

function readSnapshot(raw: string | null): PendingOrderSnapshot | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PendingOrderSnapshot;
    if (!parsed || !parsed.localOrderId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadPendingOrder(): PendingOrderSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const storage = window.localStorage;
  try {
    let activeId = storage.getItem(CURRENT_KEY);

    if (!activeId) {
      const legacy = readSnapshot(storage.getItem(LEGACY_KEY));
      if (legacy) {
        persistPendingOrder(legacy);
        storage.removeItem(LEGACY_KEY);
        activeId = legacy.localOrderId;
      } else if (legacy === null) {
        storage.removeItem(LEGACY_KEY);
      }
    }

    if (!activeId) {
      return null;
    }

    const snapshot = readSnapshot(storage.getItem(orderStorageKey(activeId)));
    if (!snapshot) {
      storage.removeItem(CURRENT_KEY);
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

export function persistPendingOrder(snapshot: PendingOrderSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }
  const storage = window.localStorage;
  const currentId = storage.getItem(CURRENT_KEY);
  if (currentId && currentId !== snapshot.localOrderId) {
    storage.removeItem(orderStorageKey(currentId));
  }
  storage.setItem(orderStorageKey(snapshot.localOrderId), JSON.stringify(snapshot));
  storage.setItem(CURRENT_KEY, snapshot.localOrderId);
}

export function clearPendingOrder() {
  if (typeof window === 'undefined') {
    return;
  }
  const storage = window.localStorage;
  const activeId = storage.getItem(CURRENT_KEY);
  if (activeId) {
    storage.removeItem(orderStorageKey(activeId));
  }
  storage.removeItem(CURRENT_KEY);
}

export function updatePendingOrderStatus(status: PendingOrderStatus, fields: Partial<PendingOrderSnapshot> = {}) {
  const existing = loadPendingOrder();
  if (!existing) {
    return null;
  }
  const next: PendingOrderSnapshot & { updatedAt: number } = {
    ...existing,
    status,
    ...fields,
    updatedAt: Date.now(),
  };
  persistPendingOrder(next);
  return next;
}
