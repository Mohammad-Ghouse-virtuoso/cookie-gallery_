import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { clearPendingOrder, loadPendingOrder, updatePendingOrderStatus } from '@/lib/pendingOrderStorage';
import { useAuth } from '@/context/AuthContext';
import type { PendingOrderSnapshot, PendingOrderStatus } from '@/types/checkout';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type VerificationState = 'idle' | 'verifying' | 'success' | 'failed' | 'missing' | 'error';

const FALLBACK_SUCCESS_TIMEOUT_MS = 4000;
const PAYMENT_STATUS_TIMEOUT_MS = 3500;

async function getIdToken(): Promise<string | null> {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const current = auth.currentUser;
    if (!current) {
      return null;
    }
    return current.getIdToken();
  } catch {
    return null;
  }
}

export default function PaymentStatusPage() {
  const { setCart } = useCart();
  const { user, authDisabled, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('session_id');
  const orderIdParam = searchParams.get('orderId');
  const canceled = searchParams.get('canceled') === '1';

  const initialPendingOrder = useMemo(() => loadPendingOrder(), []);

  const [pendingOrder, setPendingOrder] = useState<PendingOrderSnapshot | null>(initialPendingOrder);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(
    () => sessionIdParam ?? initialPendingOrder?.providerSessionId ?? null,
  );
  const [targetOrderId, setTargetOrderId] = useState<string | null>(
    () => orderIdParam ?? initialPendingOrder?.localOrderId ?? null,
  );
  const [targetSuccessPath, setTargetSuccessPath] = useState<string>(
    initialPendingOrder?.successPath || '/order-success',
  );
  const [state, setState] = useState<VerificationState>('idle');
  const [message, setMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(5);
  const inflightRequestRef = useRef<AbortController | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const hasFinalizedRef = useRef(false);
  const hasIdentifiers = useMemo(() => Boolean(targetSessionId || targetOrderId), [targetOrderId, targetSessionId]);

  useEffect(() => {
    if (targetSessionId || targetOrderId) {
      hasFinalizedRef.current = false;
    }
  }, [targetOrderId, targetSessionId]);

  const stableSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (targetSessionId) params.set('session_id', targetSessionId);
    if (targetOrderId) params.set('orderId', targetOrderId);
    if (canceled) params.set('canceled', '1');
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [canceled, targetOrderId, targetSessionId]);

  useEffect(() => {
    const handlePop = (event: PopStateEvent) => {
      event.preventDefault();
      navigate(`/payment-status${stableSearch}`, { replace: true });
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, [navigate, stableSearch]);

  useEffect(() => {
    const handleStorage = () => {
      setPendingOrder(loadPendingOrder());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (sessionIdParam) {
      setTargetSessionId(sessionIdParam);
      return;
    }
    if (pendingOrder?.providerSessionId) {
      setTargetSessionId(pendingOrder.providerSessionId);
    }
  }, [pendingOrder?.providerSessionId, sessionIdParam]);

  useEffect(() => {
    if (orderIdParam) {
      setTargetOrderId(orderIdParam);
      return;
    }
    if (pendingOrder?.localOrderId) {
      setTargetOrderId(pendingOrder.localOrderId);
    }
  }, [orderIdParam, pendingOrder?.localOrderId]);

  useEffect(() => {
    if (pendingOrder?.successPath) {
      setTargetSuccessPath(pendingOrder.successPath);
    }
  }, [pendingOrder?.successPath]);

  const cancelInflightRequest = useCallback(() => {
    if (inflightRequestRef.current) {
      inflightRequestRef.current.abort();
      inflightRequestRef.current = null;
    }
  }, []);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cancelInflightRequest();
    clearFallbackTimer();
  }, [cancelInflightRequest, clearFallbackTimer]);

  const updateLocalOrderStatus = useCallback(
    (status: PendingOrderStatus, fields: Partial<PendingOrderSnapshot> = {}) => {
      const updated = updatePendingOrderStatus(status, fields) ?? null;
      setPendingOrder(updated);
      return updated;
    },
    [],
  );

  const rehydrateIdentifiers = useCallback(() => {
    let sessionId = targetSessionId;
    let orderId = targetOrderId;
    const stored = pendingOrder ?? loadPendingOrder();

    if (!sessionId) {
      sessionId = sessionIdParam ?? stored?.providerSessionId ?? null;
      if (sessionId && sessionId !== targetSessionId) {
        setTargetSessionId(sessionId);
      }
    }

    if (!orderId) {
      orderId = orderIdParam ?? stored?.localOrderId ?? null;
      if (orderId && orderId !== targetOrderId) {
        setTargetOrderId(orderId);
      }
    }

    if ((!pendingOrder || !pendingOrder.successPath) && stored?.successPath && stored.successPath !== targetSuccessPath) {
      setTargetSuccessPath(stored.successPath);
    }

    if (!pendingOrder && stored) {
      setPendingOrder(stored);
    }

    return { sessionId, orderId };
  }, [orderIdParam, pendingOrder, sessionIdParam, targetOrderId, targetSessionId, targetSuccessPath]);

  useEffect(() => {
    if (!pendingOrder || pendingOrder.status !== 'pending') {
      return;
    }
    if (targetSessionId && pendingOrder.providerSessionId !== targetSessionId) {
      updateLocalOrderStatus('pending', { providerSessionId: targetSessionId });
    }
  }, [pendingOrder, targetSessionId, updateLocalOrderStatus]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let mutated = false;

    if (targetOrderId && !params.get('orderId')) {
      params.set('orderId', targetOrderId);
      mutated = true;
    }
    if (targetSessionId && !params.get('session_id')) {
      params.set('session_id', targetSessionId);
      mutated = true;
    }
    if (canceled) {
      if (params.get('canceled') !== '1') {
        params.set('canceled', '1');
        mutated = true;
      }
    } else if (params.has('canceled')) {
      params.delete('canceled');
      mutated = true;
    }

    if (mutated) {
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    }
  }, [canceled, location.pathname, location.search, navigate, targetOrderId, targetSessionId]);

  const resetPendingOrderState = useCallback((flushCart = false) => {
    cancelInflightRequest();
    clearPendingOrder();
    setPendingOrder(null);
    setTargetSessionId(null);
    setTargetOrderId(null);
    if (flushCart) {
      setCart({});
    }
  }, [cancelInflightRequest, setCart]);

  const clearLocalCheckoutState = useCallback(() => {
    clearFallbackTimer();
    resetPendingOrderState(true);
  }, [clearFallbackTimer, resetPendingOrderState]);

  const finalizeAndRedirect = useCallback((messageText = 'Payment confirmed. Redirecting…') => {
    if (hasFinalizedRef.current) {
      return;
    }
    hasFinalizedRef.current = true;
    cancelInflightRequest();
    clearLocalCheckoutState();
    setState('success');
    setMessage(messageText);
  }, [cancelInflightRequest, clearLocalCheckoutState]);

  const scheduleFallbackRedirect = useCallback(() => {
    if (fallbackTimerRef.current) {
      return;
    }
    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackTimerRef.current = null;
      finalizeAndRedirect();
    }, FALLBACK_SUCCESS_TIMEOUT_MS);
  }, [finalizeAndRedirect]);

  const verifyPayment = useCallback(async () => {
    const { sessionId: activeSessionId, orderId: activeOrderId } = rehydrateIdentifiers();

    if (!activeSessionId && !activeOrderId) {
      setState('missing');
      setMessage('We could not find an in-progress payment. You may need to re-open checkout.');
      return;
    }

    if (loading) {
      return;
    }

    if (!user && !authDisabled) {
      setState('error');
      setMessage('You need to be signed in to view payment status.');
      return;
    }

    cancelInflightRequest();
    clearFallbackTimer();

    const controller = new AbortController();
    inflightRequestRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), PAYMENT_STATUS_TIMEOUT_MS);

    try {
      setState('verifying');
      setMessage('Confirming your payment with Stripe…');

      const token = !authDisabled ? await getIdToken() : null;
      const query = new URLSearchParams();
      if (activeSessionId) query.set('sessionId', activeSessionId);
      if (activeOrderId) query.set('orderId', activeOrderId);

      const response = await fetch(`${API_BASE}/api/payment-status?${query.toString()}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      const rawPayload = await response.json().catch(() => null);

      if (!response.ok || !rawPayload) {
        throw new Error(rawPayload?.message || 'Unable to verify payment right now.');
      }

      const payload = rawPayload as {
        status: 'pending' | 'completed' | 'failed';
        lastKnownError?: string;
      };

      if (payload.status === 'completed') {
        updateLocalOrderStatus('completed');
        finalizeAndRedirect('Payment confirmed. Redirecting…');
        return;
      }

      if (payload.status === 'failed') {
        updateLocalOrderStatus('failed', { lastKnownError: payload.lastKnownError });
        setState('failed');
        setMessage(payload.lastKnownError || 'We could not confirm the payment.');
        return;
      }

      updateLocalOrderStatus('pending', {
        providerSessionId: activeSessionId ?? pendingOrder?.providerSessionId ?? undefined,
        lastKnownError: undefined,
      });

      if (hasIdentifiers) {
        finalizeAndRedirect('Payment almost ready. Redirecting…');
      } else {
        setState('verifying');
        setMessage('Preparing your payment details…');
      }
    } catch {
      if (hasIdentifiers) {
        finalizeAndRedirect('Payment almost ready. Redirecting…');
      } else {
        setState('error');
        setMessage('We ran into a problem confirming your payment. Please try again in a moment.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (inflightRequestRef.current === controller) {
        inflightRequestRef.current = null;
      }
    }
  }, [authDisabled, cancelInflightRequest, clearFallbackTimer, finalizeAndRedirect, hasIdentifiers, loading, pendingOrder?.providerSessionId, rehydrateIdentifiers, updateLocalOrderStatus, user]);

  useEffect(() => {
    if (canceled) {
      setState('failed');
      setMessage('It looks like the payment was canceled. You can retry when ready.');
      updateLocalOrderStatus('failed', { lastKnownError: 'Payment canceled by customer.' });
      return;
    }
    if (loading) {
      return;
    }
    if (hasFinalizedRef.current) {
      return;
    }

    if (hasFinalizedRef.current) {
      return;
    }

    const identifiers = rehydrateIdentifiers();
    if (identifiers.sessionId || identifiers.orderId) {
      void verifyPayment();
      return;
    }
    if (!pendingOrder && !sessionIdParam && !orderIdParam) {
      setState('missing');
      setMessage('We could not find an in-progress payment. Start checkout again or head back to your cart.');
    }
  }, [canceled, loading, orderIdParam, pendingOrder, rehydrateIdentifiers, sessionIdParam, updateLocalOrderStatus, verifyPayment]);

  useEffect(() => {
    if (state !== 'success') {
      return;
    }
    clearFallbackTimer();
    setCountdown(5);
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.clearInterval(interval);
          navigate(targetSuccessPath, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clearFallbackTimer, navigate, state, targetSuccessPath]);

  const handleBackToCart = () => {
    resetPendingOrderState(false);
    navigate('/cookies');
  };

  const showLoader = state === 'idle' || state === 'verifying';
  const showReturnActions = state === 'failed' || state === 'error' || state === 'missing';

  useEffect(() => {
    if (state === 'verifying' && hasIdentifiers && !hasFinalizedRef.current) {
      scheduleFallbackRedirect();
    } else {
      clearFallbackTimer();
    }
  }, [clearFallbackTimer, hasIdentifiers, scheduleFallbackRedirect, state]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF5EE] px-6 py-16 text-[#3B2B1A]">
      <div className="w-full max-w-xl space-y-8 rounded-[22px] border border-[rgba(226,185,127,0.28)] bg-white px-8 py-10 text-center shadow-[0_24px_48px_-28px_rgba(59,43,26,0.15)]">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Payment Status</p>
          <h1 className="text-[2rem] font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
            {state === 'success' ? 'Payment confirmed!' : "You're all done. Verifying your payment…"}
          </h1>
        </header>
        <p className="text-sm text-[#6B5E57]">{message}</p>

        {showLoader && (
          <div className="flex justify-center">
            <span className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-[#F4D4B2] border-t-[#C47A41]" aria-hidden="true" />
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-2 text-sm text-[#6B5E57]">
            <p>Redirecting you to your confirmation in {countdown}…</p>
            <button
              type="button"
              className="text-sm font-semibold text-[#C47A41] underline-offset-2 hover:underline"
              onClick={() => navigate(targetSuccessPath, { replace: true })}
            >
              Skip to confirmation now
            </button>
          </div>
        )}

        {showReturnActions && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                void verifyPayment();
              }}
              className="inline-flex items-center justify-center rounded-[12px] bg-[#3B2B1A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,43,26,0.18)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={handleBackToCart}
              className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-[#FFF7F0] px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-150 hover:bg-[#FFF0E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
            >
              Return to cart
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
