import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/utils/formatPrice';
import type { CookieData } from '../data/cookies';

type Props = { cookie: CookieData | null; onClose: () => void };

export default function CookieDetailsModal({ cookie, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPortalReady, setIsPortalReady] = useState(false);

  useEffect(() => {
    const existing = document.getElementById('cookie-details-modal-root') as HTMLDivElement | null;
    if (existing) {
      portalContainerRef.current = existing;
      setIsPortalReady(true);
      return;
    }

    const node = document.createElement('div');
    node.setAttribute('id', 'cookie-details-modal-root');
    document.body.appendChild(node);
    portalContainerRef.current = node;
    setIsPortalReady(true);

    return () => {
      if (portalContainerRef.current?.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
      }
      portalContainerRef.current = null;
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (cookie) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      scrollPositionRef.current = window.scrollY;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo({ top: scrollPositionRef.current });
      };
    }
  }, [cookie]);

  // Trap focus inside modal
  useEffect(() => {
    if (!cookie || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTabKey);
    };
  }, [cookie]);

  // Handle Escape key
  useEffect(() => {
    if (!cookie) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [cookie, onClose]);

  if (!isPortalReady || !portalContainerRef.current) return null;

  const nutrition = (cookie?.nutrition ?? {}) as CookieData['nutrition'];
  const val = (v: number | null | undefined, suffix = '') =>
    v === null || v === undefined ? '—' : `${v}${suffix}`;

  return createPortal(
    <AnimatePresence>
      {cookie && (
        <motion.div
          key={cookie.id}
          className="fixed inset-0 z-[999] flex min-h-screen items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <motion.div
            ref={modalRef}
            className="flex w-[min(90vw,520px)] max-h-[80vh] flex-col overflow-hidden bg-[#FFFAF4]"
            style={{
              borderRadius: '18px',
              boxShadow: '0 8px 26px rgba(0,0,0,0.15)',
              maxHeight: 'min(420px, 80vh)'
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
            onClick={e => e.stopPropagation()}
          >
          <div className="flex w-full flex-1 flex-col gap-[14px] p-6">
            <button
              onClick={onClose}
              className="self-end text-[26px] font-semibold leading-none text-[#7C6F66] transition-colors duration-150 ease-out hover:text-white"
              aria-label="Close modal"
              type="button"
            >
              ×
            </button>

            <div className="flex flex-col items-start gap-3 text-left">
              <h2 id="modal-title" className="text-[18px] font-semibold tracking-tight text-[#3E2A1F]">
                {cookie.name}
              </h2>
              <p id="modal-description" className="text-[14px] text-[#6C6C6C] leading-relaxed">
                {cookie.description}
              </p>

              {cookie.dietPreference && (
                <span className="inline-flex items-center rounded-full border border-[#E6D3BC] bg-[#FBF4EB] px-3 py-[6px] text-[11px] font-semibold uppercase tracking-wide text-[#6C4A30]">
                  {cookie.dietPreference}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="h-px w-full bg-[#F0E5D7]" aria-hidden="true" />
              <div className="space-y-[14px] pt-[14px]">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8B7A68]">
                  Nutrition (per 100g)
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] text-[#4A3B31]">
                  <div className="flex flex-col gap-1 rounded-lg bg-[#FCF7F1] px-2.5 py-2 text-center">
                    <dt className="text-[11px] font-medium text-[#7C6A59]">Energy</dt>
                    <dd className="text-[13px] font-semibold text-[#4C3626]">{val(nutrition.energy, ' kcal')}</dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg bg-[#FCF7F1] px-2.5 py-2 text-center">
                    <dt className="text-[11px] font-medium text-[#7C6A59]">Protein</dt>
                    <dd className="text-[13px] font-semibold text-[#4C3626]">{val(nutrition.protein, ' g')}</dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg bg-[#FCF7F1] px-2.5 py-2 text-center">
                    <dt className="text-[11px] font-medium text-[#7C6A59]">Total Fat</dt>
                    <dd className="text-[13px] font-semibold text-[#4C3626]">{val(nutrition.totalFat, ' g')}</dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg bg-[#FCF7F1] px-2.5 py-2 text-center">
                    <dt className="text-[11px] font-medium text-[#7C6A59]">Total Carbs</dt>
                    <dd className="text-[13px] font-semibold text-[#4C3626]">{val(nutrition.totalCarbs, ' g')}</dd>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1 rounded-lg bg-[#FCF7F1] px-2.5 py-2 text-center">
                    <dt className="text-[11px] font-medium text-[#7C6A59]">Total Sugar</dt>
                    <dd className="text-[13px] font-semibold text-[#4C3626]">{val(nutrition.totalSugar, ' g')}</dd>
                  </div>
                </dl>
              </div>

              {cookie.allergens && cookie.allergens.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8B7A68]">
                    Allergens
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {cookie.allergens.map((a, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-2">
              <div className="text-[18px] font-semibold text-[#4C3626]">
                {formatPrice(cookie.price)}
              </div>
              <button
                className="inline-flex h-[40px] w-full items-center justify-center rounded-[20px] bg-[#E2B97F] px-6 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D7A86A] hover:shadow-[0_12px_26px_rgba(193,140,93,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#B98042] active:scale-[0.97] sm:w-[190px]"
                onClick={onClose}
                type="button"
              >
                Add to Cart
              </button>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalContainerRef.current
  );
}
