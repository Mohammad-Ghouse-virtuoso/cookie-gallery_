import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import {
  loadPendingOrder,
  persistPendingOrder,
  clearPendingOrder,
  updatePendingOrderStatus,
} from '../pendingOrderStorage';
import type { PendingOrderSnapshot } from '@/types/checkout';

describe('pendingOrderStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('loadPendingOrder returns null when no order exists', () => {
    expect(loadPendingOrder()).toBeNull();
  });

  test('persistPendingOrder stores order in localStorage', () => {
    const order: PendingOrderSnapshot = {
      localOrderId: 'order-123',
      checkoutUrl: 'https://checkout.stripe.com/test',
      providerSessionId: 'sess_123',
      createdAt: Date.now(),
      cart: { classic: 2 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    persistPendingOrder(order);
    const loaded = loadPendingOrder();

    expect(loaded).toEqual(order);
  });

  test('clearPendingOrder removes order from localStorage', () => {
    const order: PendingOrderSnapshot = {
      localOrderId: 'order-456',
      checkoutUrl: 'https://checkout.stripe.com/test',
      createdAt: Date.now(),
      cart: { classic: 1 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    persistPendingOrder(order);
    expect(loadPendingOrder()).not.toBeNull();

    clearPendingOrder();
    expect(loadPendingOrder()).toBeNull();
  });

  test('updatePendingOrderStatus updates status and returns updated order', () => {
    const order: PendingOrderSnapshot = {
      localOrderId: 'order-789',
      checkoutUrl: 'https://checkout.stripe.com/test',
      createdAt: Date.now(),
      cart: { classic: 3 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    persistPendingOrder(order);
    const updated = updatePendingOrderStatus('completed');

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('completed');
    expect(updated?.localOrderId).toBe('order-789');
  });

  test('updatePendingOrderStatus returns null when no order exists', () => {
    const result = updatePendingOrderStatus('completed');
    expect(result).toBeNull();
  });

  test('updatePendingOrderStatus merges additional fields', () => {
    const order: PendingOrderSnapshot = {
      localOrderId: 'order-merge',
      checkoutUrl: 'https://checkout.stripe.com/test',
      createdAt: Date.now(),
      cart: { classic: 1 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    persistPendingOrder(order);
    const updated = updatePendingOrderStatus('failed', {
      lastKnownError: 'Payment declined',
    });

    expect(updated?.status).toBe('failed');
    expect(updated?.lastKnownError).toBe('Payment declined');
  });

  test('persistPendingOrder replaces existing order with different ID', () => {
    const order1: PendingOrderSnapshot = {
      localOrderId: 'order-001',
      checkoutUrl: 'https://checkout.stripe.com/test1',
      createdAt: Date.now(),
      cart: { classic: 1 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    const order2: PendingOrderSnapshot = {
      localOrderId: 'order-002',
      checkoutUrl: 'https://checkout.stripe.com/test2',
      createdAt: Date.now(),
      cart: { chocolate: 2 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    persistPendingOrder(order1);
    persistPendingOrder(order2);

    const loaded = loadPendingOrder();
    expect(loaded?.localOrderId).toBe('order-002');
  });

  test('handles malformed data gracefully', () => {
    localStorage.setItem('pendingOrder:current', 'invalid-json');
    expect(loadPendingOrder()).toBeNull();
  });

  test('migrates legacy storage key', () => {
    const legacyOrder: PendingOrderSnapshot = {
      localOrderId: 'legacy-order',
      checkoutUrl: 'https://checkout.stripe.com/legacy',
      createdAt: Date.now(),
      cart: { classic: 1 },
      returnPath: '/payment-status',
      status: 'pending',
    };

    localStorage.setItem('cg_pending_order_v1', JSON.stringify(legacyOrder));
    const loaded = loadPendingOrder();

    expect(loaded?.localOrderId).toBe('legacy-order');
    expect(localStorage.getItem('cg_pending_order_v1')).toBeNull();
  });
});
