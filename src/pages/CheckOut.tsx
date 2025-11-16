import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { cookies as cookieList } from '@/data/cookies';
import { formatPrice } from '@/utils/formatPrice';
import { useAuth } from '@/context/AuthContext';
import { StripeCheckoutFlow } from '@/components/payments/StripeCheckoutFlow';
import { loadCheckoutAddress } from '@/lib/checkoutAddressStorage';
import { loadPendingOrder } from '@/lib/pendingOrderStorage';
import type { CartLineItemDetail, CartStateWithMeta } from '@/types/cart';

export default function Checkout() {
  const { cart, setCart } = useCart();
  const { user, authDisabled } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState(() => loadCheckoutAddress());
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const initialOrderId = searchParams.get('orderId');
  const storedOrder = useMemo(() => loadPendingOrder(), []);
  const hasActiveOrder = Boolean(initialOrderId || storedOrder);

  const cookieLookup = useMemo(() => {
    const map = new Map<string, (typeof cookieList)[number]>();
    cookieList.forEach(cookie => map.set(cookie.id, cookie));
    return map;
  }, []);

  useEffect(() => {
    setShowLoginPrompt(!user && !authDisabled);
  }, [authDisabled, user]);

  useEffect(() => {
    if (!checkoutAddress && !hasActiveOrder) {
      navigate('/checkout/address', { replace: true });
    }
  }, [checkoutAddress, hasActiveOrder, navigate]);

  useEffect(() => {
    const handleStorage = () => {
      setCheckoutAddress(loadCheckoutAddress());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const localCartSnapshot = useMemo(() => {
    const snapshot: Record<string, number> = {};
    Object.entries(cart).forEach(([id, qty]) => {
      if (id === '_meta') {
        return;
      }
      if (typeof qty === 'number' && qty > 0) {
        snapshot[id] = qty;
      }
    });
    return snapshot;
  }, [cart]);

  const storedCartSnapshot = useMemo(() => {
    const snapshot: Record<string, number> = {};
    Object.entries(storedOrder?.cart ?? {}).forEach(([id, qty]) => {
      if (typeof qty === 'number' && qty > 0) {
        snapshot[id] = qty;
      }
    });
    return snapshot;
  }, [storedOrder?.cart]);

  const hasLocalCart = useMemo(() => Object.keys(localCartSnapshot).length > 0, [localCartSnapshot]);

  const cartSnapshot = useMemo(
    () => (hasLocalCart ? localCartSnapshot : storedCartSnapshot),
    [hasLocalCart, localCartSnapshot, storedCartSnapshot],
  );

  const mergedCartDetails = useMemo(() => {
    const stateWithMeta = cart as CartStateWithMeta;
    const details: Record<string, CartLineItemDetail> = {};
    const localMeta = stateWithMeta._meta ?? {};
    Object.entries(localMeta).forEach(([id, detail]) => {
      details[id] = detail;
    });
    const storedDetails = storedOrder?.cartDetails ?? {};
    Object.entries(storedDetails).forEach(([id, detail]) => {
      if (!details[id]) {
        details[id] = detail;
      }
    });
    return details;
  }, [cart, storedOrder?.cartDetails]);

  const orderLines = useMemo(() => {
    return Object.entries(cartSnapshot).map(([id, qty]) => {
      const meta = mergedCartDetails[id];
      const cookieInfo = cookieLookup.get(id);
      const fallbackDetail: CartLineItemDetail = meta ?? {
        type: 'cookie',
        name: cookieInfo?.name ?? id,
        price: cookieInfo?.price ?? 0,
        image: cookieInfo?.src,
        productId: cookieInfo?.id,
      };
      const resolvedDetail: CartLineItemDetail = {
        ...fallbackDetail,
        type: fallbackDetail.type ?? 'cookie',
        name: fallbackDetail.name || cookieInfo?.name || id,
        price:
          typeof fallbackDetail.price === 'number' && fallbackDetail.price > 0
            ? fallbackDetail.price
            : cookieInfo?.price ?? fallbackDetail.price ?? 0,
        image: fallbackDetail.image ?? cookieInfo?.src,
        productId: fallbackDetail.productId ?? cookieInfo?.id,
      };

      if (resolvedDetail.price < 0) {
        resolvedDetail.price = 0;
      }

      return {
        id,
        qty,
        detail: resolvedDetail,
      };
    });
  }, [cartSnapshot, cookieLookup, mergedCartDetails]);

  const totalAmount = useMemo(
    () => orderLines.reduce((sum, line) => sum + (line.detail.price ?? 0) * line.qty, 0),
    [orderLines],
  );

  const checkoutCartDetails = useMemo(() => {
    const details: Record<string, CartLineItemDetail> = {};
    orderLines.forEach(line => {
      details[line.id] = line.detail;
    });
    return details;
  }, [orderLines]);

  const stripeUser = user ?? (authDisabled ? { uid: 'e2e-guest', email: 'e2e@cookie.gallery' } : null);

  useEffect(() => {
    if (orderLines.length === 0 && !hasActiveOrder && !paymentCompleted) {
      const timer = window.setTimeout(() => navigate('/'), 220);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [orderLines.length, navigate, hasActiveOrder, paymentCompleted]);

  if (orderLines.length === 0 && !hasActiveOrder && !paymentCompleted) {
    return null;
  }

  return (
    <main
      className="min-h-screen bg-[#FDF8F2] py-10"
      style={{ backgroundImage: 'linear-gradient(140deg, rgba(250, 244, 236, 0.7), rgba(255, 248, 241, 0.9))' }}
    >
      {showLoginPrompt && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(29,21,13,0.64)] px-4">
          <div className="w-full max-w-md space-y-4 rounded-[20px] bg-white p-8 text-center shadow-[0_24px_60px_rgba(29,21,13,0.28)]">
            <h3 className="text-3xl font-semibold text-[#3B2B1A]">Sign in required</h3>
            <p className="text-sm text-[#6B5E57]">
              Sign in to your Cookie Gallery account to save your address and complete the payment securely.
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="inline-flex items-center justify-center rounded-[12px] bg-[#3B2B1A] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,43,26,0.22)] transition-transform duration-150 hover:-translate-y-0.5"
              type="button"
            >
              Go to sign in
            </button>
          </div>
        </div>
      )}

      <div
        className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[24px] border border-[rgba(226,185,127,0.24)] bg-white px-6 py-8 shadow-[0_24px_60px_rgba(59,43,26,0.08)] md:px-10 md:py-12"
        data-testid="checkout-container"
      >
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Checkout</p>
          <h1 className="text-[2.5rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
            Finalise your order
          </h1>
          <p className="text-sm text-[#6B5E57]">
            Review your pastries, confirm the delivery address, then continue to secure payment.
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <article
              className="space-y-4 rounded-[18px] border border-[rgba(226,185,127,0.2)] bg-[#FFF8F1] p-6 shadow-[0_12px_28px_rgba(59,43,26,0.06)]"
              data-testid="order-summary"
            >
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#3B2B1A]">Your cookies</h2>
                <span className="rounded-full bg-[#3B2B1A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  {orderLines.length} items
                </span>
              </header>
              <ul className="space-y-3">
                {orderLines.map(line => {
                  const { detail } = line;
                  const giftInfo = detail.type === 'gift' ? detail.gift : null;
                  const displayImage = detail.image;
                  const displayName = detail.name || line.id;
                  const deliverySummary = giftInfo
                    ? [giftInfo.address.city, giftInfo.address.pincode].filter(Boolean).join(', ')
                    : null;
                  return (
                    <li
                      key={line.id}
                      className="flex items-center justify-between rounded-[14px] border border-[rgba(226,185,127,0.26)] bg-white px-4 py-3 shadow-[0_6px_14px_rgba(59,43,26,0.05)]"
                      data-testid="cart-item"
                    >
                      <div className="flex items-center gap-4">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={displayName}
                            className="h-16 w-16 rounded-[12px] object-cover shadow-[inset_0_1px_2px_rgba(59,43,26,0.08)]"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#FBE9DA] text-sm font-semibold text-[#C47A41]">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[#3B2B1A]">{displayName}</p>
                          <p className="text-xs text-[#6B5E57]">Qty: {line.qty}</p>
                          {giftInfo ? (
                            <div className="mt-1 space-y-0.5 text-xs text-[#6B5E57]">
                              <p>Recipient: {giftInfo.recipientName}</p>
                              {deliverySummary ? <p>Delivery: {deliverySummary}</p> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#C47A41]">
                        {formatPrice((detail.price ?? 0) * line.qty)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-[rgba(226,185,127,0.26)] pt-4">
                <span className="text-sm font-semibold text-[#3B2B1A]">Order total</span>
                <span className="text-lg font-semibold text-[#C47A41]">{formatPrice(totalAmount)}</span>
              </div>
            </article>

            <article className="space-y-4 rounded-[18px] border border-[rgba(226,185,127,0.2)] bg-white p-6 shadow-[0_12px_28px_rgba(59,43,26,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8E7360]">Delivery address</p>
                  {checkoutAddress ? (
                    <div className="mt-2 text-sm text-[#3B2B1A]">
                      <p className="font-semibold">{checkoutAddress.fullName}</p>
                      <p>{checkoutAddress.line1}{checkoutAddress.line2 ? `, ${checkoutAddress.line2}` : ''}</p>
                      <p>
                        {checkoutAddress.city}
                        {checkoutAddress.state ? `, ${checkoutAddress.state}` : ''}
                      </p>
                      <p>{checkoutAddress.postalCode}</p>
                      <p className="text-[#6B5E57]">{checkoutAddress.phone}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#6B5E57]">
                      Add a delivery address so our courier knows where to head.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/checkout/address')}
                  className="rounded-full border border-[#C47A41]/30 px-3 py-1 text-xs font-semibold text-[#C47A41] transition-colors duration-150 hover:bg-[#FBE9DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]/40"
                >
                  Edit
                </button>
              </div>
            </article>
          </div>

          <aside
            className="space-y-4 rounded-[18px] border border-[rgba(226,185,127,0.2)] bg-[#FFF6F0] p-6 shadow-[0_12px_28px_rgba(59,43,26,0.06)]"
            data-testid="payment-section"
          >
            <h2 className="text-base font-semibold text-[#3B2B1A]">Secure payment</h2>
            <p className="text-xs text-[#6B5E57]">
              Payments are processed by Stripe. You’ll return here once the payment completes so we can confirm your order.
            </p>
            <StripeCheckoutFlow
              cart={cartSnapshot}
              cartDetails={checkoutCartDetails}
              totalAmount={totalAmount}
              user={stripeUser}
              shippingAddress={checkoutAddress}
              onCartCleared={() => setCart({})}
              onPaymentCompletedChange={setPaymentCompleted}
              extraOrderData={{ flow: 'standard' }}
              returnPath="/payment-status"
              successPath="/order-success"
              initialOrderId={initialOrderId}
              onReturnToCart={() => navigate('/cookies')}
            />
            <button
              type="button"
              onClick={() => navigate('/cookies')}
              className="w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
              data-testid="back-to-catalogue"
            >
              Back to catalogue
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}