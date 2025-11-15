import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearPendingOrder, loadPendingOrder, persistPendingOrder, updatePendingOrderStatus } from '@/lib/pendingOrderStorage';
import type { PendingOrderSnapshot } from '@/types/checkout';
import type { CartLineItemDetail } from '@/types/cart';
import * as Sentry from '@sentry/react';

export type CartSnapshot = Record<string, number>;

type BannerTone = 'info' | 'warning' | 'error' | 'success';

type BannerState = {
  tone: BannerTone;
  text: string;
};

type StripeCheckoutFlowProps = {
  cart: CartSnapshot;
  cartDetails?: Record<string, CartLineItemDetail>;
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
  initializeDisabled?: boolean;
  initializeDisabledReason?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const POLL_INTERVAL_MS = 2500;
const MAX_AUTO_POLLS = Math.round(30000 / POLL_INTERVAL_MS);

const redirectTo = (url: string) => {
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign(url);
  }
};

const updateCheckoutScopeTags = (tags: {
  localOrderId?: string | null;
  providerSessionId?: string | null;
}) => {
  const scope = Sentry.getCurrentScope();
  if (!scope) {
    return;
  }
  if ('localOrderId' in tags) {
    const value = tags.localOrderId ?? undefined;
    scope.setTag('localOrderId', value);
  }
  if ('providerSessionId' in tags) {
    const value = tags.providerSessionId ?? undefined;
    scope.setTag('providerSessionId', value);
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
  cartDetails = {},
  totalAmount,
  user,
  shippingAddress,
  onCartCleared,
  onPaymentCompletedChange,
  extraOrderData,
  initializeButtonLabel = 'Proceed to Pay',
  autoInitialize = false,
  returnPath = '/payment-status',
  successPath = '/order-success',
  initialOrderId,
  onReturnToCart,
  initializeDisabled = false,
  initializeDisabledReason,
}: StripeCheckoutFlowProps) {
  const navigate = useNavigate();
  const [currentOrder, setCurrentOrder] = useState<PendingOrderSnapshot | null>(() => {
    const stored = loadPendingOrder();
    if (stored) {
      return stored;
    }
    if (initialOrderId) {
      const fallback: PendingOrderSnapshot = {
        localOrderId: initialOrderId,
        createdAt: Date.now(),
        checkoutUrl: '',
        cart,
        returnPath,
        successPath,
        status: 'pending',
        cartDetails: Object.keys(cartDetails).length ? { ...cartDetails } : undefined,
      };
      persistPendingOrder(fallback);
      return fallback;
    }
    return null;
  });
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const pollAttempts = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const completionIssued = useRef(false);
  const returnBreadcrumbLogged = useRef(false);

  const syncFromStorage = useCallback(() => {
    const stored = loadPendingOrder();
    setCurrentOrder(prev => {
      if (!stored) {
        return stored;
      }
      if (!prev) {
        if (stored.status === 'pending') {
          setHasTimedOut(false);
        }
        return stored;
      }
      if (stored.localOrderId !== prev.localOrderId) {
        if (stored.status === 'pending') {
          setHasTimedOut(false);
        }
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
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollAttempts.current = 0;
    setHasTimedOut(false);
    setCurrentOrder(null);
    updateCheckoutScopeTags({ localOrderId: null, providerSessionId: null });
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
      navigate(successPath, { replace: true });
    }, 400);
  }, [clearOrderState, navigate, onCartCleared, onPaymentCompletedChange, successPath]);

  const pollStatus = useCallback(async (manual = false) => {
    if (!currentOrder) {
      return;
    }
    if (!requireAuth() || !ensureOnline()) {
      return;
    }
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
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
      const data = await response.json() as {
        status: 'pending' | 'completed' | 'failed';
        providerInfo?: Record<string, unknown>;
        lastUpdate?: number;
        message?: string;
      };
      if (data.status === 'completed') {
        setBanner(buildBanner('success', 'Payment verified. All set!'));
        handleOrderCompleted();
        return;
      }
      if (data.status === 'failed') {
        const updated = updatePendingOrderStatus('failed', {
          lastKnownError: data.message,
          providerInfo: data.providerInfo,
        }) ?? null;
        setCurrentOrder(updated);
        setBanner(buildBanner('error', data.message || 'We could not verify the payment. Please retry.'));
        return;
      }

      pollAttempts.current += 1;
      const updated = updatePendingOrderStatus('pending', {
        providerInfo: data.providerInfo,
      }) ?? currentOrder;
      setCurrentOrder(updated);
      setBanner(buildBanner('info', 'Verifying payment with Stripe. This can take a few seconds.'));
      Sentry.addBreadcrumb({
        category: 'payment.flow',
        message: 'Polling order status with backend',
        level: 'info',
        data: {
          localOrderId: currentOrder.localOrderId,
          attempt: pollAttempts.current,
        },
      });

      if (!manual && pollAttempts.current < MAX_AUTO_POLLS) {
        if (pollTimerRef.current) {
          window.clearTimeout(pollTimerRef.current);
        }
        pollTimerRef.current = window.setTimeout(() => {
          pollStatus(false);
        }, POLL_INTERVAL_MS);
        return;
      }

      if (!manual && pollAttempts.current >= MAX_AUTO_POLLS) {
        if (pollTimerRef.current) {
          window.clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setHasTimedOut(true);
        setBanner(buildBanner('warning', 'We still have not received confirmation from Stripe. You can resume payment or return to your cart.'));
      }
    } catch (error: any) {
      setBanner(buildBanner('warning', error?.message || 'Unable to contact the server. Retry shortly.'));
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
    pollAttempts.current = 0;
    setHasTimedOut(false);
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
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
          cartDetails,
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
        successPath,
        status: 'pending',
        cartDetails: Object.keys(cartDetails).length ? { ...cartDetails } : undefined,
      };
      persistPendingOrder(snapshot);
      setCurrentOrder(snapshot);
      setBanner(buildBanner('info', 'Redirecting to Stripe for secure payment…'));
      updateCheckoutScopeTags({
        localOrderId: snapshot.localOrderId,
        providerSessionId: snapshot.providerSessionId ?? null,
      });
      Sentry.addBreadcrumb({
        category: 'payment.flow',
        message: 'Redirecting user to Stripe checkout',
        level: 'info',
        data: {
          localOrderId: snapshot.localOrderId,
          hasProviderSession: Boolean(snapshot.providerSessionId),
        },
      });
      redirectTo(payload.checkoutUrl);
    } catch (error: any) {
      setBanner(buildBanner('error', error?.message || 'Unable to start payment. Please try again.'));
      Sentry.captureException(error, {
        extra: {
          reason: 'create_order_failed',
          cartSize: Object.keys(cart ?? {}).length,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, cartDetails, ensureOnline, extraOrderData, requireAuth, returnPath, successPath, shippingAddress, totalAmount, user?.email]);

  const resumeOrder = useCallback(async () => {
    if (!currentOrder) {
      onReturnToCart?.();
      return;
    }
    if (!ensureOnline() || !requireAuth()) {
      return;
    }
    setHasTimedOut(false);
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
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
      const payload = await response.json() as {
        checkoutUrl?: string;
        status?: 'completed' | 'pending' | 'failed';
        message?: string;
        providerSessionId?: string;
      };
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
        const updated = updatePendingOrderStatus('pending', {
          checkoutUrl: payload.checkoutUrl,
          providerSessionId: payload.providerSessionId ?? currentOrder.providerSessionId,
        }) ?? currentOrder;
        setCurrentOrder(updated);
        updateCheckoutScopeTags({
          localOrderId: updated.localOrderId,
          providerSessionId: updated.providerSessionId ?? null,
        });
        Sentry.addBreadcrumb({
          category: 'payment.flow',
          message: 'Resuming Stripe checkout session',
          level: 'info',
          data: {
            localOrderId: updated.localOrderId,
          },
        });
        redirectTo(payload.checkoutUrl);
        return;
      }
      throw new Error('Payment session not available.');
    } catch (error: any) {
      setBanner(buildBanner('error', error?.message || 'Unable to resume payment. Returning you to the cart.'));
      onReturnToCart?.();
      Sentry.captureException(error, {
        extra: {
          reason: 'resume_order_failed',
          localOrderId: currentOrder?.localOrderId,
        },
      });
    }
  }, [currentOrder, ensureOnline, handleOrderCompleted, onReturnToCart, requireAuth]);

  const handleManualCheck = useCallback(() => {
    if (isPolling) {
      return;
    }
    pollStatus(true);
  }, [isPolling, pollStatus]);

  const handleReturnToCart = useCallback(() => {
    clearOrderState();
    onReturnToCart?.();
  }, [clearOrderState, onReturnToCart]);

  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'completed') {
      return;
    }
    if (autoInitialize && !currentOrder.checkoutUrl) {
      createOrder();
      return;
    }
    if (currentOrder.status === 'pending') {
      pollAttempts.current = 0;
      setHasTimedOut(false);
      pollStatus(false);
    }
    if (!returnBreadcrumbLogged.current && currentOrder) {
      returnBreadcrumbLogged.current = true;
      updateCheckoutScopeTags({
        localOrderId: currentOrder.localOrderId,
        providerSessionId: currentOrder.providerSessionId ?? null,
      });
      Sentry.addBreadcrumb({
        category: 'payment.flow',
        message: 'User returned from Stripe checkout',
        level: 'info',
        data: {
          localOrderId: currentOrder.localOrderId,
          status: currentOrder.status,
        },
      });
    }
  }, [autoInitialize, createOrder, currentOrder, pollStatus]);

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
        <div className="space-y-2">
          <button
            type="button"
            onClick={createOrder}
            disabled={isSubmitting || initializeDisabled}
            className={`w-full rounded-[12px] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(196,122,65,0.28)] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A] ${
              isSubmitting || initializeDisabled
                ? 'cursor-not-allowed bg-[#CFA676] opacity-80'
                : 'bg-[#C47A41] hover:-translate-y-0.5 hover:bg-[#D48B52]'
            }`}
            aria-disabled={isSubmitting || initializeDisabled}
          >
            {isSubmitting ? 'Preparing checkout…' : initializeButtonLabel}
          </button>
          {initializeDisabled && initializeDisabledReason ? (
            <p className="text-xs text-[#8A5A14]">{initializeDisabledReason}</p>
          ) : null}
        </div>
      )}

      {currentOrder && currentOrder.status === 'pending' && (
        <div className="space-y-4 rounded-[16px] border border-[rgba(226,185,127,0.34)] bg-white p-5 shadow-[0_16px_32px_rgba(59,43,26,0.08)]">
          <div className="flex items-start gap-4">
            <span className="relative mt-1 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C47A41]/40" />
              <span className="relative inline-flex h-5 w-5 rounded-full bg-[#C47A41]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[#3B2B1A]">Verifying payment…</h3>
              <p className="mt-1 text-sm text-[#6B5E57]">
                Hang tight while we confirm your order with Stripe. We&apos;ll retry automatically for up to 30 seconds.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isPolling}
            className={`w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-[#FFF8F1] px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] ${
              isPolling ? 'cursor-wait opacity-70' : ''
            }`}
          >
            {isPolling ? 'Checking payment status…' : 'Check again now'}
          </button>

          {hasTimedOut && (
            <div className="space-y-3 rounded-[12px] border border-dashed border-[#E2B97F] bg-[#FFF6EA] p-4 text-sm text-[#7B5C3A]">
              <p className="text-sm font-medium text-[#7B5C3A]">
                We still haven&apos;t heard back from Stripe. You can reopen the checkout or head back to your cart.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={resumeOrder}
                  className="w-full rounded-[12px] bg-[#3B2B1A] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,43,26,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]"
                >
                  Resume Payment
                </button>
                <button
                  type="button"
                  onClick={handleReturnToCart}
                  className="w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
                >
                  Return to Cart
                </button>
              </div>
            </div>
          )}
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
            onClick={handleReturnToCart}
            className="w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
          >
            Back to Cart
          </button>
        </div>
      )}
    </section>
  );
}
