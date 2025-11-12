import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/utils/formatPrice';
import { loadCheckoutAddress } from '@/lib/checkoutAddressStorage';

export type CartPreviewItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
};

export type CartTotals = {
  subtotal: number;
  grandTotal: number;
  tax?: number;
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
const MAX_ITEM_QUANTITY = 3;
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

export default function CartPreviewModal(props: CartPreviewModalProps) {
  const { isOpen, onClose, items, totals, onUpdateQty, onRemove, onCheckout, onExplore, onManageAddress } = props;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [checkoutAddress, setCheckoutAddress] = useState(() => loadCheckoutAddress());

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
      setCheckoutAddress(loadCheckoutAddress());
    };
    syncAddress();
    window.addEventListener('storage', syncAddress);
    return () => {
      window.removeEventListener('storage', syncAddress);
    };
  }, [isOpen]);

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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(31,19,8,0.38)] backdrop-blur-sm px-4 py-6 sm:items-start sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[24px] bg-[#FFF9F4] shadow-[0_18px_48px_rgba(88,62,42,0.22)] border border-[#F2E5D9]/60"
        style={{
          padding: '28px',
          animation: `cartModalIn 240ms ${EASING}`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h3
            id="cart-modal-title"
            className="font-['Playfair_Display'] text-2xl font-semibold text-[#3B2B1A]"
          >
            Your Cart <span className="text-sm font-medium text-[#7C6F66]">({itemCount})</span>
          </h3>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="text-[#8B7A68] transition-colors duration-150 ease-out hover:text-[#3B2B1A] focus-visible:outline-none"
            aria-label="Close cart preview"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="mt-6 max-h-[55vh] space-y-5 overflow-y-auto pr-1 text-[#4B4035]">
          {!hasItems ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#FCEFD5] px-8 py-12 text-center text-[#4B4035] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <p className="text-base font-semibold text-[#3B2B1A]">Your cart is feeling light.</p>
              <button
                type="button"
                onClick={onExplore}
                className="rounded-full bg-[#3B2B1A] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(82,53,32,0.24)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]"
              >
                Explore catalogue
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const priceAvailable = Number.isFinite(item.price);
                const unitPrice = priceAvailable ? formatPrice(item.price) : '—';
                const linePrice = priceAvailable ? formatPrice(item.price * item.qty) : '—';
                const tint = resolveTint(item.id);
                const domId = sanitizeDomId(item.id);
                return (
                  <li
                    key={item.id}
                    id={domId}
                    className="flex items-center gap-4 rounded-[20px] bg-white/85 p-4 shadow-[0_18px_42px_rgba(139,122,104,0.18)] transition-transform duration-250 ease-out hover:-translate-y-[3px] hover:shadow-[0_18px_48px_rgba(90,64,53,0.2)] animate-[cartItemEnter_220ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
                  >
                    <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[12px]">
                      <div
                        className="absolute inset-0 border border-white/40"
                        style={{
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${tint.base}, ${tint.accent})`,
                        }}
                        aria-hidden="true"
                      />
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="relative z-[1] h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 z-[0] flex items-center justify-center text-3xl" aria-hidden="true">
                        🍪
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold text-[#3B2B1A]">{item.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8F7C6A]">
                        {priceAvailable ? (
                          <>
                            <span>{unitPrice} each</span>
                            <span aria-hidden="true">•</span>
                            <span className="text-sm font-semibold text-[#C47A41]" aria-label={`Line total ${linePrice}`}>
                              {linePrice} total
                            </span>
                          </>
                        ) : (
                          <span>Price unavailable</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                        disabled={item.qty <= 0}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B2B1A] text-lg text-white shadow-[0_10px_22px_rgba(59,43,26,0.28)] transition-transform duration-150 ease-out hover:-translate-y-[2px] hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-[#3B2B1A]" aria-live="polite">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.id, Math.min(item.qty + 1, MAX_ITEM_QUANTITY))}
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.qty >= MAX_ITEM_QUANTITY}
                        title={item.qty >= MAX_ITEM_QUANTITY ? `Limit of ${MAX_ITEM_QUANTITY} per item` : undefined}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B2B1A] text-lg text-white shadow-[0_10px_22px_rgba(59,43,26,0.28)] transition-transform duration-150 ease-out hover:-translate-y-[2px] hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:-translate-y-0"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="ml-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#E35B48] shadow-[0_6px_16px_rgba(227,91,72,0.22)] transition-transform duration-150 ease-out hover:-translate-y-[2px] hover:bg-[#FFE3DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F1998C]"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-5">
          <section className="rounded-[14px] border border-[rgba(226,185,127,0.28)] bg-[#FFF6F0] p-4 shadow-[0_12px_24px_rgba(59,43,26,0.06)]" aria-labelledby="checkout-address-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="checkout-address-heading" className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8E7360]">Delivery address</p>
                {checkoutAddress ? (
                  <div className="mt-2 text-sm text-[#3B2B1A]">
                    <p className="font-semibold">{checkoutAddress.fullName}</p>
                    <p>{checkoutAddress.line1}{checkoutAddress.line2 ? `, ${checkoutAddress.line2}` : ''}</p>
                    <p>{checkoutAddress.city}{checkoutAddress.state ? `, ${checkoutAddress.state}` : ''}</p>
                    <p>{checkoutAddress.postalCode}</p>
                    <p className="text-[#6B5E57]">{checkoutAddress.phone}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#6B5E57]">
                    Add a delivery address before paying. We’ll take you there if it’s missing.
                  </p>
                )}
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
                className="rounded-full border border-[#C47A41]/30 px-3 py-1 text-xs font-semibold text-[#C47A41] transition-colors duration-150 hover:bg-[#FBE9DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]/40"
              >
                Edit
              </button>
            </div>
          </section>
          <div className="h-px w-full bg-[#EDE3D7]" aria-hidden="true" />
          <div className="flex items-center justify-between text-sm text-[#4B4035]">
            <span className="font-semibold text-[#3B2B1A]">Subtotal</span>
            <span className="text-base font-semibold text-[#C47A41]">{formatPrice(totals.subtotal)}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#3B2B1A] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(59,43,26,0.26)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#4B4035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41]"
              style={{ backgroundImage: 'linear-gradient(140deg, #4B4035 0%, #3B2B1A 100%)' }}
            >
              Continue Shopping
            </button>
            <button
              type="button"
              onClick={onCheckout}
              disabled={!hasItems}
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#C47A41] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(196,122,65,0.3)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D48B52] hover:shadow-[0_20px_40px_rgba(196,122,65,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B2B1A] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:bg-[#C47A41] disabled:hover:shadow-none"
            >
              Proceed to Checkout
            </button>
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
