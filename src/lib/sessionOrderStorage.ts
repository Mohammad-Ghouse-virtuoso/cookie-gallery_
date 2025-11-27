/**
 * Session-scoped order storage
 * Used to track orders placed in the current browser session
 * Crucial for test phone users who shouldn't see cross-user order history
 */

const SESSION_ORDERS_KEY = 'cg_session_orders';

export interface SessionOrder {
  orderId: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
    image?: string;
  }>;
}

/**
 * Add an order to the current session's order list
 */
export function addSessionOrder(order: SessionOrder): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getSessionOrders();
    // Prevent duplicates
    if (existing.some(o => o.orderId === order.orderId)) return;
    
    const updated = [order, ...existing]; // Newest first
    sessionStorage.setItem(SESSION_ORDERS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save session order:', error);
  }
}

/**
 * Get all orders from the current session
 */
export function getSessionOrders(): SessionOrder[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = sessionStorage.getItem(SESSION_ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionOrder[];
  } catch {
    return [];
  }
}

/**
 * Clear all session orders (on sign out or session end)
 */
export function clearSessionOrders(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_ORDERS_KEY);
}

/**
 * Get a specific order by ID from session storage
 */
export function getSessionOrderById(orderId: string): SessionOrder | null {
  const orders = getSessionOrders();
  return orders.find(o => o.orderId === orderId) ?? null;
}
