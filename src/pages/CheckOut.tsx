import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { cookies as cookieList } from '@/data/cookies';
import { formatPrice } from '@/utils/formatPrice';
import { useAuth } from '@/context/AuthContext';
import { StripeCheckoutFlow } from '@/components/payments/StripeCheckoutFlow';
import { loadCheckoutAddress } from '@/lib/checkoutAddressStorage';
import { loadPendingOrder } from '@/lib/pendingOrderStorage';

export default function Checkout() {
  const { cart, setCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState(() => loadCheckoutAddress());
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const initialOrderId = searchParams.get('orderId');
  const storedOrder = useMemo(() => loadPendingOrder(), []);
  const hasActiveOrder = Boolean(initialOrderId || storedOrder);

  useEffect(() => {
    setShowLoginPrompt(!user);
  }, [user]);

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

  const effectiveCart = useMemo(() => {
    const hasLocalCart = Object.keys(cart).length > 0;
    if (hasLocalCart) {
      return cart;
    }
    return storedOrder?.cart ?? {};
  }, [cart, storedOrder?.cart]);

  const cartSnapshot = useMemo(() => {
    const snapshot: Record<string, number> = {};
    Object.entries(effectiveCart).forEach(([id, qty]) => {
      if (typeof qty === 'number' && qty > 0) {
        snapshot[id] = qty;
      }
    });
    return snapshot;
  }, [effectiveCart]);

  const selectedCookies = useMemo(
    () => cookieList.filter(cookie => (cartSnapshot[cookie.id] ?? 0) > 0),
    [cartSnapshot],
  );

  const totalAmount = useMemo(
    () => selectedCookies.reduce((sum, cookie) => sum + (cartSnapshot[cookie.id] ?? 0) * cookie.price, 0),
    [selectedCookies, cartSnapshot],
  );

  useEffect(() => {
    if (selectedCookies.length === 0 && !hasActiveOrder && !paymentCompleted) {
      const timer = window.setTimeout(() => navigate('/'), 220);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [selectedCookies.length, navigate, hasActiveOrder, paymentCompleted]);

  if (selectedCookies.length === 0 && !hasActiveOrder && !paymentCompleted) {
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

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[24px] border border-[rgba(226,185,127,0.24)] bg-white px-6 py-8 shadow-[0_24px_60px_rgba(59,43,26,0.08)] md:px-10 md:py-12">
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
            <article className="space-y-4 rounded-[18px] border border-[rgba(226,185,127,0.2)] bg-[#FFF8F1] p-6 shadow-[0_12px_28px_rgba(59,43,26,0.06)]">
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#3B2B1A]">Your cookies</h2>
                <span className="rounded-full bg-[#3B2B1A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  {selectedCookies.length} items
                </span>
              </header>
              <ul className="space-y-3">
                {selectedCookies.map(cookie => (
                  <li
                    key={cookie.id}
                    className="flex items-center justify-between rounded-[14px] border border-[rgba(226,185,127,0.26)] bg-white px-4 py-3 shadow-[0_6px_14px_rgba(59,43,26,0.05)]"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={cookie.src}
                        alt={cookie.name}
                        className="h-16 w-16 rounded-[12px] object-cover shadow-[inset_0_1px_2px_rgba(59,43,26,0.08)]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#3B2B1A]">{cookie.name}</p>
                        <p className="text-xs text-[#6B5E57]">Qty: {cartSnapshot[cookie.id]}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#C47A41]">
                      {formatPrice((cartSnapshot[cookie.id] ?? 0) * cookie.price)}
                    </p>
                  </li>
                ))}
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

          <aside className="space-y-4 rounded-[18px] border border-[rgba(226,185,127,0.2)] bg-[#FFF6F0] p-6 shadow-[0_12px_28px_rgba(59,43,26,0.06)]">
            <h2 className="text-base font-semibold text-[#3B2B1A]">Secure payment</h2>
            <p className="text-xs text-[#6B5E57]">
              Payments are processed by Stripe. You’ll return here once the payment completes so we can confirm your order.
            </p>
            <StripeCheckoutFlow
              cart={cartSnapshot}
              totalAmount={totalAmount}
              user={user}
              shippingAddress={checkoutAddress}
              onCartCleared={() => setCart({})}
              onPaymentCompletedChange={setPaymentCompleted}
              extraOrderData={{ flow: 'standard' }}
              returnPath="/checkout"
              successPath="/order-success"
              initialOrderId={initialOrderId}
              onReturnToCart={() => navigate('/cookies')}
            />
            <button
              type="button"
              onClick={() => navigate('/cookies')}
              className="w-full rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-5 py-2.5 text-sm font-semibold text-[#6B5E57] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
            >
              Back to catalogue
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}