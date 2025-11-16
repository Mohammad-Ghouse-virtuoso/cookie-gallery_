import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/utils/formatPrice';
import { loadCheckoutAddress } from '@/lib/checkoutAddressStorage';
import { useAuth } from '@/context/AuthContext';
import type { CartLineItemDetail } from '@/types/cart';

export type CartPreviewItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  detail: CartLineItemDetail;
};

export type CartTotals = {
  subtotal: number;
  grandTotal: number;
  shipping?: number;
};

type CartPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: CartPreviewItem[];
  totals: CartTotals;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onExplore: () => void;
  onManageAddress?: () => void;
};

const EASING = 'cubic-bezier(0.45, 0, 0.55, 1)';
const MAX_ITEM_QUANTITY = 10;
const FALLBACK_GRADIENTS: Array<{ base: string; accent: string }> = [
  { base: '#FDE5CF', accent: '#F9D4B5' },
  { base: '#FCDED6', accent: '#F7C3B4' },
  { base: '#FCEFD5', accent: '#F7DDBC' },
  { base: '#F8E2E4', accent: '#F6CED5' },
  { base: '#F2E2D5', accent: '#EFD0BC' },
];

const sanitizeDomId = (id: string) => `cart-item-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

const resolveTint = (id: string) => {
  if (!id) return FALLBACK_GRADIENTS[0];
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
};

const ClockIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 6.8v5.1l3.6 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const LocationPinIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3.4c-3.26 0-5.9 2.64-5.9 5.9 0 4.33 3.8 8.36 5.35 9.84.31.3.79.3 1.1 0 1.55-1.48 5.35-5.51 5.35-9.84 0-3.26-2.64-5.9-5.9-5.9Zm0 8.5a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z"
      fill="currentColor"
    />
  </svg>
);

export default function CartPreviewModal(props: CartPreviewModalProps) {
  const { isOpen, onClose, items, totals, onUpdateQty, onRemove, onCheckout, onExplore, onManageAddress } = props;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const ownerKey = user?.email?.toLowerCase() ?? null;
  const [checkoutAddress, setCheckoutAddress] = useState(() => loadCheckoutAddress(ownerKey ?? undefined));
  const addressSummary = useMemo(() => {
    if (!checkoutAddress) {
      return null;
    }
    const parts = [
      checkoutAddress.line1,
      checkoutAddress.line2,
      checkoutAddress.city,
      checkoutAddress.state,
      checkoutAddress.postalCode,
    ]
      .map(value => (typeof value === 'string' ? value.trim() : ''))
      .filter((value): value is string => Boolean(value));
    if (!parts.length) {
      return null;
    }
    return parts.join(', ');
  }, [checkoutAddress]);

  // Lock body scroll when the mini-cart is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const syncAddress = () => {
      setCheckoutAddress(loadCheckoutAddress(ownerKey ?? undefined));
    };
    syncAddress();
    window.addEventListener('storage', syncAddress);
    return () => {
      window.removeEventListener('storage', syncAddress);
    };
  }, [isOpen, ownerKey]);

  // Close on ESC and trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Auto-focus close button on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.qty, 0), [items]);
  const shippingProvided = typeof totals.shipping === 'number' ? Math.max(0, totals.shipping) : null;
  const derivedShipping = Math.max(0, (totals.grandTotal ?? totals.subtotal) - totals.subtotal);
  const shippingAmount = shippingProvided ?? derivedShipping;
  const hasShipping = shippingAmount > 0;
  const payableTotal = totals.grandTotal ?? totals.subtotal + shippingAmount;
  const shipmentLabel = `Shipment of ${itemCount === 1 ? '1 item' : `${itemCount} items`}`;
  const checkoutDisabled = items.length === 0;
  const manageAddressLabel = checkoutAddress ? 'Edit' : 'Add';
  if (!isOpen) return null;

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const hasItems = items.length > 0;

  const handleRemove = (id: string) => {
    const domId = sanitizeDomId(id);
    const element = document.getElementById(domId);
    if (element) {
      element.classList.add('cart-item-exit');
      window.setTimeout(() => onRemove(id), 180);
    } else {
      onRemove(id);
    }
  };

  const handleQuantityChange = (id: string, qty: number) => {
    const domId = sanitizeDomId(id);
    const element = document.getElementById(domId);
    if (element) {
      element.classList.add('cart-qty-shake');
      window.setTimeout(() => element.classList.remove('cart-qty-shake'), 320);
    }
    onUpdateQty(id, qty);
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex justify-end bg-[rgba(31,19,8,0.38)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={dialogRef}
        className="flex h-full w-full max-w-[460px] min-w-[min(94vw,340px)] flex-col border-l border-[rgba(226,185,127,0.4)] bg-[#FFF9F4] shadow-[-18px_0_32px_rgba(59,43,26,0.18)]"
        style={{
          animation: `cartModalIn 240ms ${EASING}`,
          maxHeight: '100vh',
        }}
        data-testid="cart-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(226,185,127,0.25)] px-5 py-4">
          <h3
            id="cart-modal-title"
            className="font-['Playfair_Display'] text-xl font-semibold text-[#3B2B1A]"
          >
            Cart <span className="text-sm font-medium text-[#7C6F66]">({itemCount})</span>
          </h3>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white text-lg text-[#7C6F66] transition-colors duration-150 hover:text-[#3B2B1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]/40"
            aria-label="Close cart preview"
          >
            ×
          </button>
        </div>
        {/* Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 text-[#4B4035]">
          {hasItems ? (
            <div className="space-y-3.5">
              <div className="rounded-[18px] border border-[rgba(226,185,127,0.22)] bg-white px-4 py-3 shadow-[0_12px_24px_rgba(59,43,26,0.08)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F7EC] text-[#0DB04B]">
                    <ClockIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2F2A1E]">Quick delivery window</p>
                    <p className="text-xs text-[#6B5E57]">{shipmentLabel}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#0DB04B]">
                  <span className="inline-flex rounded-full bg-[#DFF7E9] px-3 py-1 text-[11px] tracking-wide">
                    {hasShipping ? `Delivery fee ${formatPrice(shippingAmount)}` : 'Free doorstep delivery'}
                  </span>
                </div>
              </div>

              <ul className="space-y-3" aria-live="polite">
                {items.map(item => {
                  const resolvedPrice = Number.isFinite(item.detail?.price ?? item.price)
                    ? (item.detail?.price ?? item.price)
                    : 0;
                  const unitPrice = resolvedPrice > 0 ? formatPrice(resolvedPrice) : '—';
                  const linePrice = resolvedPrice > 0 ? formatPrice(resolvedPrice * item.qty) : '—';
                  const domId = sanitizeDomId(item.id);
                  const tint = resolveTint(item.id);
                  const isGift = item.detail?.type === 'gift';
                  const giftDetails = item.detail?.gift;
                  const disableDecrement = item.qty <= 0;
                  const disableIncrement = isGift ? true : item.qty >= MAX_ITEM_QUANTITY;
                  const placeholderInitial = item.name?.trim()?.charAt(0)?.toUpperCase() ?? 'C';
                  return (
                    <li
                      key={item.id}
                      id={domId}
                      className="flex gap-3 rounded-[18px] border border-[rgba(226,185,127,0.16)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(59,43,26,0.08)] animate-[cartItemEnter_220ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
                      data-testid={`cart-preview-item-${item.id}`}
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[14px]" aria-hidden="true">
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(135deg, ${tint.base}, ${tint.accent})` }}
                        />
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="relative z-[1] h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="relative z-[1] flex h-full w-full items-center justify-center text-lg font-semibold text-[#C47A41]">
                            {placeholderInitial}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-semibold text-[#2F2A1E]">{item.name}</p>
                          <p className="text-xs text-[#7C6F66]">{unitPrice} each</p>
                          {isGift && giftDetails ? (
                            <div className="space-y-1 text-xs text-[#6B5E57]">
                              <p>Recipient: {giftDetails.recipientName}</p>
                              <p>Deliver to: {giftDetails.address.city}, {giftDetails.address.pincode}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm font-semibold text-[#2F2A1E]" aria-label={`Line total ${linePrice}`}>
                            {linePrice}
                          </span>
                          <div className="flex items-center gap-2" aria-label={`${item.name} quantity`}>
                            <button
                              type="button"
                              onClick={() => {
                                const nextQty = Math.max(0, item.qty - 1);
                                if (nextQty === 0) {
                                  handleRemove(item.id);
                                } else {
                                  handleQuantityChange(item.id, nextQty);
                                }
                              }}
                              aria-label={`Decrease quantity of ${item.name}`}
                              disabled={disableDecrement}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-base font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82E7A6] ${
                                disableDecrement
                                  ? 'cursor-not-allowed border-[#82E7A6]/60 text-[#82E7A6]/80'
                                  : 'border-[#0DB04B] text-[#0DB04B] hover:bg-[#0DB04B] hover:text-white'
                              }`}
                              data-testid={`cart-preview-decrement-${item.id}`}
                            >
                              −
                            </button>
                            <span
                              className="min-w-[2rem] text-center text-sm font-semibold text-[#2F2A1E]"
                              data-testid={`cart-preview-quantity-${item.id}`}
                            >
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, Math.min(item.qty + 1, MAX_ITEM_QUANTITY))}
                              aria-label={`Increase quantity of ${item.name}`}
                              disabled={disableIncrement}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-base font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82E7A6] ${
                                disableIncrement
                                  ? 'cursor-not-allowed border-[#82E7A6]/60 text-[#82E7A6]/80'
                                  : 'border-[#0DB04B] text-[#0DB04B] hover:bg-[#0DB04B] hover:text-white'
                              }`}
                              data-testid={`cart-preview-increment-${item.id}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[16px] border border-[rgba(226,185,127,0.35)] bg-[#FFF5E9] px-5 py-8 text-center" data-testid="cart-preview-empty">
              <p className="text-sm font-semibold text-[#3B2B1A]">Your cart is empty.</p>
              <button
                type="button"
                onClick={onExplore}
                className="rounded-[12px] bg-[#0DB04B] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(13,176,75,0.28)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82E7A6]"
              >
                Browse cookies
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(226,185,127,0.25)] bg-white px-5 py-4">
          <div className="space-y-3.5">
            <div className="flex items-center gap-3 rounded-[18px] border border-[rgba(226,185,127,0.25)] bg-[#FFF9F2] px-4 py-3 text-left shadow-[0_12px_24px_rgba(59,43,26,0.08)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2E8DE] text-[#C47A41]">
                <LocationPinIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E7360]">Deliver to</p>
                <p className="truncate text-sm font-semibold text-[#3B2B1A]">
                  {checkoutAddress ? checkoutAddress.fullName?.trim() || 'Unnamed recipient' : 'No address saved'}
                </p>
                <p className="truncate text-xs text-[#6B5E57]">
                  {checkoutAddress ? addressSummary ?? 'Add the street and landmark for smoother delivery.' : 'Add an address before checkout.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onManageAddress) {
                    onManageAddress();
                  } else {
                    onCheckout();
                  }
                }}
                className="rounded-full border border-[#C47A41]/40 px-3 py-1.5 text-xs font-semibold text-[#C47A41] transition-colors duration-150 hover:bg-[#FCEFE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]/40"
              >
                {manageAddressLabel}
              </button>
            </div>

            <div className="rounded-[18px] border border-[rgba(226,185,127,0.22)] bg-white px-4 py-3 shadow-[0_12px_24px_rgba(59,43,26,0.08)]">
              <div className="flex items-center justify-between text-sm text-[#6B5E57]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#3B2B1A]">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[#6B5E57]">Delivery fee</span>
                {hasShipping ? (
                  <span className="font-semibold text-[#3B2B1A]">{formatPrice(shippingAmount)}</span>
                ) : (
                  <span className="font-semibold text-[#0DB04B]">Included</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[#2F2A1E]">
                <span>Total payable</span>
                <span>{formatPrice(payableTotal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#0DB04B] px-4 py-4 text-white shadow-[0_26px_48px_rgba(13,176,75,0.32)]">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Total</p>
                <p className="text-2xl font-semibold">{formatPrice(payableTotal)}</p>
              </div>
              <button
                type="button"
                onClick={onCheckout}
                disabled={checkoutDisabled}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl leading-none text-[#0DB04B] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  checkoutDisabled ? 'cursor-not-allowed opacity-60 hover:-translate-y-0' : 'hover:-translate-y-0.5'
                }`}
                aria-label="Proceed to payment"
                data-testid="cart-preview-checkout"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes cartModalIn {
            from { opacity: 0; transform: translateY(16px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes cartItemEnter {
            0% { opacity: 0; transform: translateY(12px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes cartItemExit {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(8px) scale(0.95); }
          }

          @keyframes cartQuantityShake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            50% { transform: translateX(2px); }
            75% { transform: translateX(-1px); }
            100% { transform: translateX(0); }
          }

          .cart-item-exit {
            animation: cartItemExit 180ms ${EASING} forwards;
          }

          .cart-qty-shake {
            animation: cartQuantityShake 320ms ${EASING};
          }
        `}
      </style>
    </div>,
    document.body
  );
}
