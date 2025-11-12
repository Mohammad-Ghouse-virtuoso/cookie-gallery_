import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearPendingOrder, loadPendingOrder, persistPendingOrder, updatePendingOrderStatus } from '@/lib/pendingOrderStorage';
import type { PendingOrderSnapshot } from '@/types/checkout';

export type CartSnapshot = Record<string, number>;

type BannerTone = 'info' | 'warning' | 'error' | 'success';

type BannerState = {
  tone: BannerTone;
  text: string;
};

type StripeCheckoutFlowProps = {
  cart: CartSnapshot;
  totalAmount: number;
  user: any;
  shippingAddress?: Record<string, unknown> | null;
  onCartCleared?: () => void;
  onPaymentCompletedChange?: (completed: boolean) => void;
  extraOrderData?: Record<string, unknown>;
  initializeButtonLabel?: string;
  payButtonLabel?: string;
  autoInitialize?: boolean;
  returnPath?: string;
  successPath?: string;
  initialOrderId?: string | null;
  onReturnToCart?: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_AUTO_POLLS = 6;
const POLL_INTERVAL_MS = 5000;

const redirectTo = (url: string) => {
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign(url);
  }
};

async function getIdToken(): Promise<string | null> {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const current = auth.currentUser;
    if (!current) return null;
    return current.getIdToken();
  } catch {
    return null;
  }
}

function buildBanner(tone: BannerTone, text: string): BannerState {
  return { tone, text };
}

export function StripeCheckoutFlow({
  cart,
  totalAmount,
  user,
  shippingAddress,
  onCartCleared,
  onPaymentCompletedChange,
  extraOrderData,
  initializeButtonLabel = 'Proceed to Pay',
  autoInitialize = false,
  returnPath = '/checkout',
  successPath = '/order-success',
  initialOrderId,
  onReturnToCart,
}: StripeCheckoutFlowProps) {
  const navigate = useNavigate();
  const [currentOrder, setCurrentOrder] = useState<PendingOrderSnapshot | null>(() => {
    const stored = loadPendingOrder();
    if (stored) {
      return stored;
    }
    if (initialOrderId) {
      return {
        localOrderId: initialOrderId,
        createdAt: Date.now(),
        checkoutUrl: '',
        cart,
        returnPath,
        status: 'pending',
      };
    }
    return null;
  });
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const pollAttempts = useRef(0);
  const completionIssued = useRef(false);

  const syncFromStorage = useCallback(() => {
    const stored = loadPendingOrder();
    setCurrentOrder(prev => {
      if (!stored) {
        return stored;
      }
      if (!prev) {
        return stored;
      }
      if (stored.localOrderId !== prev.localOrderId) {
        return stored;
      }
      return stored;
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, [syncFromStorage]);

  const requireAuth = useCallback(() => {
    if (!user) {
      setBanner(buildBanner('error', 'You must be signed in to continue to payment.'));
      return false;
    }
    return true;
  }, [user]);

  const ensureOnline = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setOffline(true);
      setBanner(buildBanner('warning', 'You appear offline. Reconnect to continue checkout or return to your cart.'));
      return false;
    }
    setOffline(false);
    return true;
  }, []);

  const clearOrderState = useCallback(() => {
    clearPendingOrder();
    setCurrentOrder(null);
  }, []);

  const handleOrderCompleted = useCallback(() => {
    if (completionIssued.current) {
      return;
    }
    completionIssued.current = true;
    onCartCleared?.();
    onPaymentCompletedChange?.(true);
    clearOrderState();
    setBanner(buildBanner('success', 'Payment verified. Redirecting to your confirmation…'));
    window.setTimeout(() => {
      navigate(successPath);
    }, 1200);
  }, [clearOrderState, navigate, onCartCleared, onPaymentCompletedChange, successPath]);

  const pollStatus = useCallback(async (manual = false) => {
    if (!currentOrder) {
      return;
    }
    if (!requireAuth() || !ensureOnline()) {
      return;
    }
    try {
      setIsPolling(true);
      const token = await getIdToken();
      const response = await fetch(`${API_BASE}/api/order-status?orderId=${encodeURIComponent(currentOrder.localOrderId)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`Status check failed (${response.status})`);
      }
      const data = await response.json() as { status: 'pending' | 'completed' | 'failed'; providerInfo?: Record<string, unknown>; lastUpdate?: number; message?: string };
      if (data.status === 'completed') {
        setBanner(buildBanner('success', 'Payment received — verifying your order. All set!'));
        handleOrderCompleted();
        return;
      }
      if (data.status === 'failed') {
        const updated = updatePendingOrderStatus('failed', { lastKnownError: data.message }) ?? null;
        setCurrentOrder(updated);
        setBanner(buildBanner('error', data.message || 'We could not verify the payment. Please retry.'));
        return;
      }
      // pending
      pollAttempts.current += 1;
      const updated = updatePendingOrderStatus('pending', {}) ?? currentOrder;
      setCurrentOrder(updated);
      setBanner(buildBanner('info', 'Payment received — verifying your order. This may take a moment. If nothing happens, tap Return to Checkout.'));
      if (!manual && pollAttempts.current < MAX_AUTO_POLLS) {
        window.setTimeout(() => {
          pollStatus(false);
        }, POLL_INTERVAL_MS);
      }
    } catch (error: any) {
      setBanner(buildBanner('warning', error?.message || 'Unable to contact the server. Retry shortly.'));
    } finally {
      setIsPolling(false);
    }
  }, [currentOrder, ensureOnline, handleOrderCompleted, requireAuth]);

  const createOrder = useCallback(async () => {
    if (!ensureOnline() || !requireAuth()) {
      return;
    }
    if (!cart || Object.keys(cart).length === 0) {
      setBanner(buildBanner('warning', 'Your cart looks empty. Add cookies before paying.'));
      return;
    }
    setIsSubmitting(true);
    setBanner(buildBanner('info', 'Creating a secure checkout session…'));
    try {
      const token = await getIdToken();
      const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          cart,
          totalAmount,
          returnPath,
          successPath,
          shippingAddress,
          metadata: extraOrderData ?? {},
          customerEmail: user?.email ?? null,
        }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || 'Failed to create checkout session.');
      }
      const payload = await response.json() as {
        checkoutUrl: string;
        localOrderId: string;
        providerSessionId?: string;
      };
      const snapshot: PendingOrderSnapshot = {
        localOrderId: payload.localOrderId,
        checkoutUrl: payload.checkoutUrl,
        providerSessionId: payload.providerSessionId,
        createdAt: Date.now(),
        cart: { ...cart },
        returnPath,
        status: 'pending',
      };
      persistPendingOrder(snapshot);
      setCurrentOrder(snapshot);
      setBanner(buildBanner('info', 'Redirecting to Stripe for secure payment…'));
      redirectTo(payload.checkoutUrl);
    } catch (error: any) {
      setBanner(buildBanner('error', error?.message || 'Unable to start payment. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, ensureOnline, extraOrderData, requireAuth, returnPath, successPath, shippingAddress, totalAmount, user?.email]);

  const resumeOrder = useCallback(async () => {
    if (!currentOrder) {
      onReturnToCart?.();
      return;
    }
    if (!ensureOnline() || !requireAuth()) {
      return;
    }
    setBanner(buildBanner('info', 'Reconnecting you to the payment page…'));
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_BASE}/api/resume-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId: currentOrder.localOrderId }),
      });
      if (!response.ok) {
        throw new Error('We could not recover the payment session.');
      }
      const payload = await response.json() as { checkoutUrl?: string; status?: 'completed' | 'pending' | 'failed'; message?: string };
      if (payload.status === 'completed') {
        setBanner(buildBanner('success', 'Payment already completed. Finishing up…'));
        handleOrderCompleted();
        return;
      }
      if (payload.status === 'failed') {
        const updated = updatePendingOrderStatus('failed', { lastKnownError: payload.message }) ?? null;
        setCurrentOrder(updated);
        setBanner(buildBanner('error', payload.message || 'Payment session expired.')); 
        onReturnToCart?.();
        return;
      }
      if (payload.checkoutUrl) {
        redirectTo(payload.checkoutUrl);
        return;
      }
      throw new Error('Payment session not available.');
    } catch (error: any) {
      setBanner(buildBanner('error', error?.message || 'Unable to resume payment. Returning you to the cart.'));
      onReturnToCart?.();
    }
  }, [currentOrder, ensureOnline, handleOrderCompleted, onReturnToCart, requireAuth]);

  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'completed') {
      return;
    }
    if (autoInitialize && !currentOrder.checkoutUrl) {
      createOrder();
      return;
    }
    pollAttempts.current = 0;
    if (currentOrder.status === 'pending') {
      pollStatus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.localOrderId]);

  const bannerClass = useMemo(() => {
    if (!banner) return '';
    switch (banner.tone) {
      case 'success':
        return 'bg-[#E4F6E8] text-[#1F6B2E] border border-[#8FD6A1]';
      case 'error':
        return 'bg-[#FDE8E6] text-[#9A291E] border border-[#F3B3A8]';
      case 'warning':
        return 'bg-[#FFF4DC] text-[#8A5A14] border border-[#F2CF8E]';
      default:
        return 'bg-[#F2F8FF] text-[#23487B] border border-[#B7D3F5]';
    }
  }, [banner]);

  return (
    <section className="space-y-4" aria-live="polite">
      {offline && (
        <div className="rounded-[12px] border border-[#F2CF8E] bg-[#FFF4DC] px-4 py-3 text-sm text-[#8A5A14]">
          You appear offline. Please reconnect to continue or return to your cart.
        </div>
      )}
      {banner && (
        <div className={`rounded-[12px] px-4 py-3 text-sm font-medium ${bannerClass}`}>
          {banner.text}
        </div>
      )}

      {!currentOrder && (
        <button
          type="button"
          onClick={createOrder}
          disabled={isSubmitting}
          className={`w-full rounded-[12px] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(196,122,65,0.28)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A] ${
            isSubmitting ? 'bg-[#CFA676] cursor-wait' : 'bg-[#C47A41] hover:-translate-y-0.5 hover:bg-[#D48B52]'
          }`}
        >
          {isSubmitting ? 'Preparing checkout…' : initializeButtonLabel}
        </button>
      )}

      {currentOrder && currentOrder.status === 'pending' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => pollStatus(true)}
            disabled={isPolling}
            className={`w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] ${
              isPolling ? 'cursor-wait opacity-70' : ''
            }`}
          >
            {isPolling ? 'Checking payment status…' : 'Refresh status'}
          </button>
          <button
            type="button"
            onClick={resumeOrder}
            className="w-full rounded-[12px] bg-[#3B2B1A] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,43,26,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]"
          >
            Return to Checkout
          </button>
        </div>
      )}

      {currentOrder && currentOrder.status === 'failed' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={createOrder}
            className="w-full rounded-[12px] bg-[#C47A41] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(196,122,65,0.3)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#D48B52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A]"
          >
            Retry Payment
          </button>
          <button
            type="button"
            onClick={() => {
              clearOrderState();
              onReturnToCart?.();
            }}
            className="w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
          >
            Back to Cart
          </button>
        </div>
      )}
    </section>
  );
}
