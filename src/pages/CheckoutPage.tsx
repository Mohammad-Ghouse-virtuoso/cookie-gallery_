import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { cookies as cookieList } from '@/data/cookies';
import { formatPrice } from '@/utils/formatPrice';
import { StripeCheckoutFlow, type CartSnapshot } from '@/components/payments/StripeCheckoutFlow';
import { getEmptyCheckoutAddress, loadCheckoutAddress, persistCheckoutAddress } from '@/lib/checkoutAddressStorage';
import { loadCheckoutDraft, persistCheckoutDraft, clearCheckoutDraft } from '@/lib/checkoutDraft';
import { loadPendingOrder } from '@/lib/pendingOrderStorage';
import type { CheckoutAddress } from '@/types/checkout';
import type { CartLineItemDetail, CartStateWithMeta } from '@/types/cart';

const REQUIRED_FIELDS: Array<keyof CheckoutAddress> = ['fullName', 'phone', 'line1', 'city', 'postalCode'];

const PHONE_PATTERN = /^[0-9+\-\s]{6,}$/;
const POSTAL_PATTERN = /^[0-9]{6}$/;
const MAX_ITEM_QUANTITY = 10;

function buildCartSnapshot(cart: Record<string, number>, pendingSnapshot?: CartSnapshot | null) {
  const snapshot: Record<string, number> = {};
  const hasLocalItems = Object.entries(cart).some(([id, qty]) => id !== '_meta' && typeof qty === 'number' && qty > 0);
  const source = hasLocalItems ? cart : pendingSnapshot ?? {};
  Object.entries(source).forEach(([id, qty]) => {
    if (id === '_meta') return;
    if (typeof qty === 'number' && qty > 0) {
      snapshot[id] = qty;
    }
  });
  return snapshot;
}

function computeAddressErrors(address: Partial<CheckoutAddress> | undefined) {
  const errors: Partial<Record<keyof CheckoutAddress, string>> = {};
  const stringFor = (field: keyof CheckoutAddress) => {
    const value = address?.[field];
    if (typeof value === 'string') {
      return value;
    }
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  };

  if (!stringFor('fullName').trim()) {
    errors.fullName = 'Add the recipient name.';
  }
  const phone = stringFor('phone');
  if (!phone.trim()) {
    errors.phone = 'Add a contact number.';
  } else if (!PHONE_PATTERN.test(phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (!stringFor('line1').trim()) {
    errors.line1 = 'Add the street and house details.';
  }
  if (!stringFor('city').trim()) {
    errors.city = 'Add the city name.';
  }
  const postal = stringFor('postalCode');
  if (!postal.trim()) {
    errors.postalCode = 'Add a PIN code.';
  } else if (!POSTAL_PATTERN.test(postal.trim())) {
    errors.postalCode = 'Enter a 6-digit PIN code.';
  }
  if (!stringFor('country').trim()) {
    errors.country = 'Select a country.';
  }
  return errors;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, setCart } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const pendingOrder = useMemo(() => loadPendingOrder(), []);
  const cookieLookup = useMemo(() => {
    const map = new Map<string, (typeof cookieList)[number]>();
    cookieList.forEach(cookie => map.set(cookie.id, cookie));
    return map;
  }, []);
  const initialOrderId = searchParams.get('orderId');
  const fromSource = searchParams.get('from');
  const giftId = searchParams.get('giftId');
  const fromGift = fromSource === 'gift' && !!giftId;
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const draft = useMemo(() => loadCheckoutDraft(), []);
  const savedAddress = useMemo(() => loadCheckoutAddress(), []);
  const recoveredFromDraft = useMemo(() => Boolean(draft && Object.keys(draft.address ?? {}).length > 0), [draft]);
  const [showDraftToast, setShowDraftToast] = useState(recoveredFromDraft);
  const baseAddress = useMemo(() => getEmptyCheckoutAddress(), []);
  const [address, setAddress] = useState<CheckoutAddress>(() => {
    if (draft && draft.address) {
      return { ...baseAddress, ...draft.address };
    }
    if (savedAddress) {
      return { ...baseAddress, ...savedAddress };
    }
    return { ...baseAddress };
  });
  const [dirtyFields, setDirtyFields] = useState<Record<keyof CheckoutAddress, boolean>>({
    fullName: false,
    phone: false,
    line1: false,
    line2: false,
    city: false,
    state: false,
    postalCode: false,
    country: false,
  });
  const [isEditingAddress, setIsEditingAddress] = useState(() => !savedAddress);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const timer = window.setTimeout(() => {
      headingRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let focusTimer: number | null = null;
    if (location.hash === '#address') {
      setIsEditingAddress(true);
      focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    } else if (!savedAddress) {
      focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    }
    return () => {
      if (focusTimer) {
        window.clearTimeout(focusTimer);
      }
    };
  }, [location.hash, savedAddress]);

  useEffect(() => {
    if (!recoveredFromDraft) {
      return;
    }
    const timeout = window.setTimeout(() => setShowDraftToast(false), 5200);
    return () => window.clearTimeout(timeout);
  }, [recoveredFromDraft]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      persistCheckoutDraft(address);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [address]);

  const errors = useMemo(() => computeAddressErrors(address), [address]);
  const isAddressValid = useMemo(() => REQUIRED_FIELDS.every(field => !errors[field]), [errors]);

  useEffect(() => {
    if (isAddressValid) {
      persistCheckoutAddress(address);
    }
  }, [address, isAddressValid]);

  const cartSnapshot = useMemo(() => buildCartSnapshot(cart, pendingOrder?.cart), [cart, pendingOrder?.cart]);

  const localCartDetails = useMemo(() => {
    const state = cart as CartStateWithMeta;
    return state._meta ?? {};
  }, [cart]);

  const mergedCartDetails = useMemo(() => {
    const details: Record<string, CartLineItemDetail> = {};
    Object.entries(localCartDetails).forEach(([id, detail]) => {
      details[id] = detail;
    });
    const persistedDetails = pendingOrder?.cartDetails ?? {};
    Object.entries(persistedDetails).forEach(([id, detail]) => {
      if (!details[id]) {
        details[id] = detail;
      }
    });
    return details;
  }, [localCartDetails, pendingOrder?.cartDetails]);

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

      return { id, qty, detail: resolvedDetail };
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

  const hasItems = orderLines.length > 0;
  const hasActiveOrder = Boolean(initialOrderId || pendingOrder);

  useEffect(() => {
    if (!hasItems && !hasActiveOrder && !paymentCompleted) {
      const timer = window.setTimeout(() => navigate('/cookies', { replace: true }), 240);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [hasActiveOrder, hasItems, navigate, paymentCompleted]);

  const extraOrderData = useMemo(() => {
    const meta: Record<string, unknown> = {
      flow: fromGift ? 'gift' : 'standard',
    };
    if (fromGift && giftId) {
      meta.giftId = giftId;
    }
    return meta;
  }, [fromGift, giftId]);

  const handleQuantityChange = useCallback((id: string, qty: number) => {
    setCart(prev => {
      const next = { ...(prev as CartStateWithMeta) } as CartStateWithMeta;
      next._meta = next._meta ? { ...next._meta } : undefined;

      const currentDetail = next._meta?.[id];
      if (currentDetail?.type === 'gift') {
        return prev;
      }

      if (qty > 0) {
        next[id] = qty;
        const cookieInfo = cookieLookup.get(id);
        const meta = (next._meta ??= {});
        if (cookieInfo) {
          meta[id] = {
            type: 'cookie',
            name: cookieInfo.name,
            image: cookieInfo.src,
            price: cookieInfo.price,
            productId: cookieInfo.id,
          };
        } else if (!meta[id]) {
          meta[id] = {
            type: 'cookie',
            name: id,
            price: 0,
          };
        }
      } else {
        delete next[id];
        if (next._meta) {
          delete next._meta[id];
        }
      }
      return next as unknown as typeof prev;
    });
  }, [cookieLookup, setCart]);

  const markDirty = useCallback((field: keyof CheckoutAddress) => {
    setDirtyFields(prev => ({ ...prev, [field]: true }));
  }, []);

  const disabledReason = !hasItems && !hasActiveOrder
    ? 'Add items to your cart to continue.'
    : !isAddressValid
      ? 'Fill in your delivery address to continue.'
      : isOffline
        ? 'You appear offline — reconnect to continue.'
        : null;

  const handleReturnToCart = useCallback(() => {
    navigate('/cookies');
  }, [navigate]);

  const handlePaymentCompletedChange = useCallback((completed: boolean) => {
    if (completed) {
      setPaymentCompleted(true);
      clearCheckoutDraft();
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#FBF5EE] pb-16" data-testid="checkout-root">
      <div className="mx-auto w-full max-w-6xl px-5 pt-10 lg:px-8" data-testid="checkout-container">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Checkout</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-semibold text-[#3B2B1A] focus:outline-none"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Finalise your order
          </h1>
          <p className="max-w-2xl text-sm text-[#6B5E57]">
            Review your delights, confirm where they&apos;re headed, and secure your payment with Stripe.
          </p>
        </header>

        {showDraftToast && (
          <div className="mt-6 rounded-[12px] border border-[#B7D3F5] bg-[#F2F8FF] px-4 py-3 text-sm text-[#23487B]" role="status">
            We recovered your checkout draft.
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section
              className="rounded-[18px] border border-[rgba(226,185,127,0.28)] bg-white p-6 shadow-[0_16px_32px_rgba(59,43,26,0.08)]"
              aria-live="polite"
              data-testid="order-summary"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#3B2B1A]">Order summary</h2>
                <span className="rounded-full bg-[#FCEFE3] px-3 py-1 text-xs font-semibold text-[#C47A41]">{orderLines.length} items</span>
              </div>

              {orderLines.length === 0 ? (
                <div className="mt-6 rounded-[14px] border border-dashed border-[#E2B97F] bg-[#FFF6EA] px-5 py-8 text-center text-sm text-[#7B5C3A]">
                  Your cart is empty. <button type="button" className="underline" onClick={handleReturnToCart}>Browse cookies</button> to continue.
                </div>
              ) : (
                <ul className="mt-4 space-y-4">
                  {orderLines.map(line => {
                    const { detail } = line;
                    const giftInfo = detail.type === 'gift' ? detail.gift : null;
                    const displayName = detail.name || line.id;
                    const displayImage = detail.image;
                    const qty = line.qty;
                    const isGift = detail.type === 'gift';
                    const disableDecrement = qty <= 0 || isGift;
                    const disableIncrement = qty >= MAX_ITEM_QUANTITY || isGift;
                    const deliverySummary = giftInfo
                      ? [giftInfo.address.city, giftInfo.address.pincode].filter(Boolean).join(', ')
                      : null;
                    return (
                      <li
                        key={line.id}
                        className="flex items-start gap-4 rounded-[14px] border border-[rgba(226,185,127,0.24)] bg-[#FFF9F4] p-4"
                        data-testid="cart-item"
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={displayName}
                            className="h-16 w-16 rounded-[12px] object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#FBE9DA] text-sm font-semibold text-[#C47A41]">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-1 items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#3B2B1A]">{displayName}</p>
                              {isGift ? (
                                <span className="rounded-full bg-[#F3E2F9] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6E3D8C]">
                                  Gift
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[#7C6F66]">{formatPrice(detail.price ?? 0)} / item</p>
                            {giftInfo ? (
                              <div className="mt-2 space-y-0.5 text-xs text-[#7C6F66]">
                                <p>Recipient: {giftInfo.recipientName}</p>
                                {deliverySummary ? <p>Delivery: {deliverySummary}</p> : null}
                                {giftInfo.senderName ? <p>Sender: {giftInfo.senderName}</p> : null}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-sm font-semibold text-[#3B2B1A]">{formatPrice((detail.price ?? 0) * qty)}</span>
                            {isGift ? (
                              <span className="text-xs text-[#7C6F66]">Gift quantities are fixed at checkout.</span>
                            ) : (
                              <div className="flex items-center gap-2" aria-label={`${displayName} quantity`}>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0DB04B] text-base font-semibold text-[#0DB04B] transition-colors duration-150 hover:bg-[#0DB04B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82E7A6] disabled:cursor-not-allowed disabled:border-[#82E7A6]/60 disabled:text-[#82E7A6]/80 disabled:hover:bg-transparent disabled:hover:text-[#82E7A6]/80"
                                  onClick={() => handleQuantityChange(line.id, Math.max(0, qty - 1))}
                                  aria-label={`Decrease quantity of ${displayName}`}
                                  disabled={disableDecrement}
                                >
                                  −
                                </button>
                                <span className="min-w-[2rem] text-center text-sm font-semibold text-[#3B2B1A]">{qty}</span>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0DB04B] text-base font-semibold text-[#0DB04B] transition-colors duration-150 hover:bg-[#0DB04B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82E7A6] disabled:cursor-not-allowed disabled:border-[#82E7A6]/60 disabled:text-[#82E7A6]/80 disabled:hover:bg-transparent disabled:hover:text-[#82E7A6]/80"
                                  onClick={() => handleQuantityChange(line.id, Math.min(qty + 1, MAX_ITEM_QUANTITY))}
                                  aria-label={`Increase quantity of ${displayName}`}
                                  disabled={disableIncrement}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-[18px] border border-[rgba(226,185,127,0.28)] bg-white p-6 shadow-[0_16px_32px_rgba(59,43,26,0.08)]" id="address" aria-labelledby="checkout-address-title">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#8E7360]" id="checkout-address-title">Delivery address</p>
                  <h2 className="mt-2 text-lg font-semibold text-[#3B2B1A]">Where should we deliver?</h2>
                </div>
                {!isEditingAddress && savedAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAddress(true);
                      markDirty('fullName');
                      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
                      window.setTimeout(() => window.clearTimeout(timer), 0);
                    }}
                    className="rounded-full border border-[#C47A41]/40 px-3 py-1 text-xs font-semibold text-[#C47A41] transition-colors duration-150 hover:bg-[#FBE9DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]/40"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!isEditingAddress && savedAddress ? (
                <div className="mt-4 space-y-1 text-sm text-[#3B2B1A]">
                  <p className="font-semibold">{savedAddress.fullName}</p>
                  <p>{savedAddress.line1}{savedAddress.line2 ? `, ${savedAddress.line2}` : ''}</p>
                  <p>{savedAddress.city}{savedAddress.state ? `, ${savedAddress.state}` : ''}</p>
                  <p>{savedAddress.postalCode}</p>
                  <p className="text-[#6B5E57]">{savedAddress.phone}</p>
                </div>
              ) : (
                <form className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2" autoComplete="on">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-fullName">Full name</label>
                    <input
                      ref={firstFieldRef}
                      id="checkout-fullName"
                      name="fullName"
                      value={address.fullName}
                      onChange={(event) => setAddress(prev => ({ ...prev, fullName: event.target.value }))}
                      onBlur={() => markDirty('fullName')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.fullName && errors.fullName ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="name"
                      aria-invalid={dirtyFields.fullName && Boolean(errors.fullName)}
                    />
                    {dirtyFields.fullName && errors.fullName ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.fullName}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-phone">Phone</label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      value={address.phone}
                      onChange={(event) => setAddress(prev => ({ ...prev, phone: event.target.value }))}
                      onBlur={() => markDirty('phone')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.phone && errors.phone ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="tel"
                      aria-invalid={dirtyFields.phone && Boolean(errors.phone)}
                    />
                    {dirtyFields.phone && errors.phone ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.phone}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-postal">PIN code</label>
                    <input
                      id="checkout-postal"
                      name="postalCode"
                      value={address.postalCode}
                      onChange={(event) => setAddress(prev => ({ ...prev, postalCode: event.target.value }))}
                      onBlur={() => markDirty('postalCode')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.postalCode && errors.postalCode ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="postal-code"
                      inputMode="numeric"
                      aria-invalid={dirtyFields.postalCode && Boolean(errors.postalCode)}
                    />
                    {dirtyFields.postalCode && errors.postalCode ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.postalCode}</p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-line1">Address line 1</label>
                    <input
                      id="checkout-line1"
                      name="line1"
                      value={address.line1}
                      onChange={(event) => setAddress(prev => ({ ...prev, line1: event.target.value }))}
                      onBlur={() => markDirty('line1')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.line1 && errors.line1 ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="address-line1"
                      aria-invalid={dirtyFields.line1 && Boolean(errors.line1)}
                    />
                    {dirtyFields.line1 && errors.line1 ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.line1}</p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-line2">Address line 2 (optional)</label>
                    <input
                      id="checkout-line2"
                      name="line2"
                      value={address.line2 ?? ''}
                      onChange={(event) => setAddress(prev => ({ ...prev, line2: event.target.value }))}
                      className="mt-1 w-full rounded-[12px] border border-[rgba(226,185,127,0.45)] px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41]"
                      autoComplete="address-line2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-city">City</label>
                    <input
                      id="checkout-city"
                      name="city"
                      value={address.city}
                      onChange={(event) => setAddress(prev => ({ ...prev, city: event.target.value }))}
                      onBlur={() => markDirty('city')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.city && errors.city ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="address-level2"
                      aria-invalid={dirtyFields.city && Boolean(errors.city)}
                    />
                    {dirtyFields.city && errors.city ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.city}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-state">State</label>
                    <input
                      id="checkout-state"
                      name="state"
                      value={address.state ?? ''}
                      onChange={(event) => setAddress(prev => ({ ...prev, state: event.target.value }))}
                      className="mt-1 w-full rounded-[12px] border border-[rgba(226,185,127,0.45)] px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41]"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#8E7360]" htmlFor="checkout-country">Country</label>
                    <input
                      id="checkout-country"
                      name="country"
                      value={address.country}
                      onChange={(event) => setAddress(prev => ({ ...prev, country: event.target.value }))}
                      onBlur={() => markDirty('country')}
                      className={`mt-1 w-full rounded-[12px] border px-3 py-2 text-sm text-[#3B2B1A] focus:outline-none focus:ring-2 focus:ring-[#C47A41] ${dirtyFields.country && errors.country ? 'border-[#F1998C]' : 'border-[rgba(226,185,127,0.45)]'}`}
                      autoComplete="country-name"
                      aria-invalid={dirtyFields.country && Boolean(errors.country)}
                    />
                    {dirtyFields.country && errors.country ? (
                      <p className="mt-1 text-xs text-[#C44531]">{errors.country}</p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAddressValid) {
                          REQUIRED_FIELDS.forEach(field => markDirty(field));
                          firstFieldRef.current?.focus();
                          return;
                        }
                        setIsEditingAddress(false);
                      }}
                      className="rounded-[12px] border border-[rgba(226,185,127,0.45)] px-4 py-2 text-sm font-semibold text-[#6B5E57] transition-colors duration-150 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.45)]"
                    >
                      Save address
                    </button>
                    <p className="text-xs text-[#7C6F66]">We&apos;ll save this for next time.</p>
                  </div>
                </form>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <section
              className="rounded-[18px] border border-[rgba(226,185,127,0.28)] bg-white p-6 shadow-[0_16px_32px_rgba(59,43,26,0.08)]"
              data-testid="payment-section"
            >
              <h2 className="text-lg font-semibold text-[#3B2B1A]">Payment</h2>
              <p className="mt-1 text-xs text-[#6B5E57]">Payments are processed securely by Stripe.</p>

              <dl className="mt-4 space-y-2 text-sm text-[#3B2B1A]">
                <div className="flex items-center justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold text-[#C47A41]">{formatPrice(totalAmount)}</dd>
                </div>
                <div className="flex items-center justify-between text-xs text-[#7C6F66]">
                  <dt>Shipping</dt>
                  <dd>Calculated after payment</dd>
                </div>
              </dl>

              {isOffline && (
                <div className="mt-4 rounded-[12px] border border-[#F2CF8E] bg-[#FFF4DC] px-4 py-3 text-xs text-[#8A5A14]">
                  You appear offline — reconnect to continue. You can retry after reconnecting or return to your cart.
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOffline(typeof navigator !== 'undefined' && navigator.onLine === false)}
                      className="rounded-[10px] border border-[rgba(226,185,127,0.45)] px-3 py-1 text-xs font-semibold text-[#6B5E57]"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToCart}
                      className="rounded-[10px] bg-[#3B2B1A] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Save & Return to cart
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <StripeCheckoutFlow
                  cart={cartSnapshot}
                  cartDetails={checkoutCartDetails}
                  totalAmount={totalAmount}
                  user={user}
                  shippingAddress={isAddressValid ? address : undefined}
                  onCartCleared={() => setCart({})}
                  onPaymentCompletedChange={handlePaymentCompletedChange}
                  extraOrderData={extraOrderData}
                  initializeButtonLabel="Pay Now"
                  returnPath="/payment-status"
                  successPath="/order-success"
                  initialOrderId={initialOrderId}
                  onReturnToCart={handleReturnToCart}
                  initializeDisabled={Boolean(disabledReason)}
                  initializeDisabledReason={disabledReason}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
