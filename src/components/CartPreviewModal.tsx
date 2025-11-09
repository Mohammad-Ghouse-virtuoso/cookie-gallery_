import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/utils/formatPrice';

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
};

const EASING = 'cubic-bezier(0.45, 0, 0.55, 1)';
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="32" fill="%23F3E4D4"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%23C28C5B" font-family="sans-serif" font-size="36">🍪</text></svg>';

export default function CartPreviewModal(props: CartPreviewModalProps) {
  const { isOpen, onClose, items, totals, onUpdateQty, onRemove, onCheckout, onExplore } = props;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when the mini-cart is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
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

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(34,24,18,0.45)] backdrop-blur-sm px-4 py-6 sm:items-start sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[20px] bg-[#FFF9F3] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        style={{
          padding: '24px',
          animation: `cartModalIn 240ms ${EASING}`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h3
            id="cart-modal-title"
            className="font-['DM_Sans',sans-serif] text-xl font-semibold text-[#3B2B1A]"
          >
            Your Cart <span className="text-sm font-medium text-[#7C6F66]">({itemCount})</span>
          </h3>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="text-[#7C6F66] transition-opacity duration-150 ease-out hover:opacity-60 focus-visible:outline-none"
            aria-label="Close cart preview"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="mt-6 max-h-[55vh] space-y-5 overflow-y-auto pr-1">
          {!hasItems ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-[#FDF1E2] px-6 py-10 text-center text-[#4C3728]">
              <p className="text-base font-semibold">Your cart is feeling light.</p>
              <button
                type="button"
                onClick={onExplore}
                className="rounded-full bg-[#E2B97F] px-6 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(226,185,127,0.32)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D7A86A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9955A]"
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
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-[0_10px_30px_rgba(153,120,93,0.12)] transition-transform duration-200 ease-out hover:-translate-y-[2px]"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3E4D4]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_IMAGE;
                            event.currentTarget.onerror = null;
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">🍪</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#3A2E27]">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8F7C6A]">
                        {priceAvailable ? (
                          <>
                            <span>{unitPrice} each</span>
                            <span aria-hidden="true">•</span>
                            <span className="text-sm font-semibold text-[#C28C5B]" aria-label={`Line total ${linePrice}`}>
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
                        onClick={() => onUpdateQty(item.id, Math.max(0, item.qty - 1))}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5EBDD] text-lg text-[#3A2E27] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A]"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-[#3A2E27]" aria-live="polite">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.qty + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5EBDD] text-lg text-[#3A2E27] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="ml-2 rounded-full border border-[#FFC7C7] px-3 py-1 text-xs font-semibold text-[#FF5C5C] transition-colors duration-150 ease-out hover:bg-[#FFE3E3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A8A]"
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
        <div className="mt-6 space-y-5">
          <div className="h-px w-full bg-[rgba(0,0,0,0.06)]" aria-hidden="true" />
          <div className="flex items-center justify-between text-sm text-[#3B2B1A]">
            <span className="font-medium">Subtotal</span>
            <span className="text-base font-semibold text-[#C48C55]">{formatPrice(totals.subtotal)}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex w-full items-center justify-center rounded-[12px] bg-[#F6ECDC] px-6 py-3 text-sm font-semibold text-[#3A2E27] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(139,122,104,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A]"
            >
              Continue Shopping
            </button>
            <button
              type="button"
              onClick={onCheckout}
              disabled={!hasItems}
              className="inline-flex w-full items-center justify-center rounded-[12px] bg-[#E2B97F] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D7A86A] hover:shadow-[0_14px_30px_rgba(226,185,127,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9955A] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:bg-[#E2B97F] disabled:hover:shadow-none"
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
        `}
      </style>
    </div>,
    document.body
  );
}
