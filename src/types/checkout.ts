export type CheckoutAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type PendingOrderStatus = 'pending' | 'completed' | 'failed';

import type { CartLineItemDetail } from './cart';

export type PendingOrderSnapshot = {
  localOrderId: string;
  createdAt: number;
  checkoutUrl: string;
  cart: Record<string, number>;
  returnPath: string;
  status: PendingOrderStatus;
  providerSessionId?: string;
  lastKnownError?: string;
  updatedAt?: number;
  providerInfo?: Record<string, unknown>;
  successPath?: string;
  cartDetails?: Record<string, CartLineItemDetail>;
};
