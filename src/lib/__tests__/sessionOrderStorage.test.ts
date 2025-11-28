import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import {
  addSessionOrder,
  getSessionOrders,
  clearSessionOrders,
  getSessionOrderById,
  type SessionOrder,
} from '../sessionOrderStorage';

describe('sessionOrderStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  const createMockOrder = (overrides: Partial<SessionOrder> = {}): SessionOrder => ({
    orderId: `order_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    totalAmount: 599,
    itemCount: 2,
    createdAt: new Date().toISOString(),
    items: [
      { id: 'cookie-1', name: 'Chocolate Chip', qty: 1, price: 299 },
      { id: 'cookie-2', name: 'Oatmeal Raisin', qty: 1, price: 300 },
    ],
    ...overrides,
  });

  describe('getSessionOrders', () => {
    test('returns empty array when no orders exist', () => {
      expect(getSessionOrders()).toEqual([]);
    });

    test('returns empty array for invalid JSON in storage', () => {
      sessionStorage.setItem('cg_session_orders', 'invalid-json');
      expect(getSessionOrders()).toEqual([]);
    });

    test('returns stored orders', () => {
      const order = createMockOrder();
      addSessionOrder(order);
      
      const orders = getSessionOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe(order.orderId);
    });
  });

  describe('addSessionOrder', () => {
    test('adds order to session storage', () => {
      const order = createMockOrder();
      addSessionOrder(order);
      
      const orders = getSessionOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0]).toEqual(order);
    });

    test('adds newest orders first', () => {
      const order1 = createMockOrder({ orderId: 'order-1' });
      const order2 = createMockOrder({ orderId: 'order-2' });
      
      addSessionOrder(order1);
      addSessionOrder(order2);
      
      const orders = getSessionOrders();
      expect(orders).toHaveLength(2);
      expect(orders[0].orderId).toBe('order-2'); // Newest first
      expect(orders[1].orderId).toBe('order-1');
    });

    test('prevents duplicate orders by orderId', () => {
      const order = createMockOrder({ orderId: 'duplicate-order' });
      
      addSessionOrder(order);
      addSessionOrder(order); // Try to add same order again
      
      const orders = getSessionOrders();
      expect(orders).toHaveLength(1);
    });

    // Note: Storage error handling is implemented but difficult to test in JSDOM
    // The implementation does catch and log errors gracefully
  });

  describe('clearSessionOrders', () => {
    test('removes all orders from session storage', () => {
      addSessionOrder(createMockOrder({ orderId: 'order-1' }));
      addSessionOrder(createMockOrder({ orderId: 'order-2' }));
      
      expect(getSessionOrders()).toHaveLength(2);
      
      clearSessionOrders();
      
      expect(getSessionOrders()).toHaveLength(0);
    });

    test('handles already empty storage', () => {
      expect(() => clearSessionOrders()).not.toThrow();
      expect(getSessionOrders()).toEqual([]);
    });
  });

  describe('getSessionOrderById', () => {
    test('returns null for non-existent order', () => {
      expect(getSessionOrderById('non-existent')).toBeNull();
    });

    test('returns order when it exists', () => {
      const order = createMockOrder({ orderId: 'specific-order' });
      addSessionOrder(order);
      
      const found = getSessionOrderById('specific-order');
      expect(found).not.toBeNull();
      expect(found?.orderId).toBe('specific-order');
    });

    test('returns correct order from multiple orders', () => {
      addSessionOrder(createMockOrder({ orderId: 'order-1', totalAmount: 100 }));
      addSessionOrder(createMockOrder({ orderId: 'order-2', totalAmount: 200 }));
      addSessionOrder(createMockOrder({ orderId: 'order-3', totalAmount: 300 }));
      
      const found = getSessionOrderById('order-2');
      expect(found?.totalAmount).toBe(200);
    });
  });

  describe('order data integrity', () => {
    test('preserves all order fields', () => {
      const order: SessionOrder = {
        orderId: 'complete-order-123',
        totalAmount: 1499.50,
        itemCount: 3,
        createdAt: '2025-11-28T10:30:00.000Z',
        items: [
          { id: 'c1', name: 'Double Chocolate', qty: 2, price: 349, image: '/img/choco.jpg' },
          { id: 'c2', name: 'Vanilla Dream', qty: 1, price: 299 },
          { id: 'c3', name: 'Peanut Butter', qty: 1, price: 502.50, image: '/img/pb.jpg' },
        ],
      };
      
      addSessionOrder(order);
      const loaded = getSessionOrderById('complete-order-123');
      
      expect(loaded).toEqual(order);
      expect(loaded?.items[0].image).toBe('/img/choco.jpg');
      expect(loaded?.items[1].image).toBeUndefined();
    });

    test('handles empty items array', () => {
      const order = createMockOrder({ items: [], itemCount: 0 });
      addSessionOrder(order);
      
      const loaded = getSessionOrderById(order.orderId);
      expect(loaded?.items).toEqual([]);
      expect(loaded?.itemCount).toBe(0);
    });
  });

  describe('session isolation', () => {
    test('orders persist across function calls within session', () => {
      addSessionOrder(createMockOrder({ orderId: 'persist-test' }));
      
      // Simulate reading in a different context
      const orders1 = getSessionOrders();
      const orders2 = getSessionOrders();
      
      expect(orders1).toEqual(orders2);
      expect(orders1[0].orderId).toBe('persist-test');
    });
  });
});
