import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

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

export default function CartPreviewModal(props: CartPreviewModalProps) {
  const { isOpen, onClose, items, totals, onUpdateQty, onRemove, onCheckout, onExplore } = props;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Close on ESC, focus trap
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !dialogRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Auto focus close button on open
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      const btn = dialogRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]');
      btn?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  const itemCount = useMemo(() => items.reduce((acc, it) => acc + it.qty, 0), [items]);
  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: `modalIn 220ms ${EASING}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[color:#fffaf3]">
          <h3 id="cart-modal-title" className="text-xl font-extrabold text-[color:#5b3a20]">
            Your Cart <span className="text-sm font-semibold text-[color:#8a5a3a]">({itemCount})</span>
          </h3>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-[color:#5b3a20] hover:bg-[color:#f8eddc] focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
            aria-label="Close cart preview"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[color:#5b3a20] font-medium mb-3">Your cart is feeling light.</p>
              <button
                className="rounded-full bg-[color:#f1b55c] hover:bg-[color:#dba661] text-[color:#3a2310] font-semibold px-5 py-2 focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
                onClick={onExplore}
              >
                Explore catalogue
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <div className="image-frame ambient-glow w-16 h-16 rounded-xl overflow-hidden relative">
                    <img src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="img-light-sweep" aria-hidden="true"></div>
                    <div className="img-gloss" aria-hidden="true"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[color:#5b3a20] font-semibold truncate">{it.name}</div>
                    <div className="text-sm text-[color:#8a5a3a]">₹{it.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQty(it.id, Math.max(0, it.qty - 1))}
                      aria-label={`Decrease quantity of ${it.name}`}
                      className="rounded-full w-8 h-8 flex items-center justify-center border border-gray-200 text-[color:#5b3a20] hover:bg-[color:#f8eddc] focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-[color:#5b3a20]" aria-live="polite">{it.qty}</span>
                    <button
                      onClick={() => onUpdateQty(it.id, it.qty + 1)}
                      aria-label={`Increase quantity of ${it.name}`}
                      className="rounded-full w-8 h-8 flex items-center justify-center bg-[color:#f1b55c] hover:bg-[color:#dba661] text-[color:#3a2310] font-bold focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(it.id)}
                    aria-label={`Remove ${it.name}`}
                    className="ml-2 text-sm text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-[color:#fffaf3]">
          <div className="flex items-center justify-between text-[color:#5b3a20] mb-3">
            <span className="font-semibold">Subtotal</span>
            <span className="font-bold">₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onExplore}
              className="rounded-full px-4 py-2 text-[color:#5b3a20] hover:bg-[color:#f8eddc] font-medium focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
            >
              Continue shopping
            </button>
            <button
              onClick={onCheckout}
              className="cta-glow rounded-full px-5 py-2 bg-[color:#f1b55c] hover:bg-[color:#dba661] text-[color:#3a2310] font-bold focus:outline-none focus:ring-2 focus:ring-[color:#dba661]"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes modalIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @media (prefers-reduced-motion: reduce) { .modalIn { animation: none !important; } }
        `}
      </style>
    </div>,
    document.body
  );
}
