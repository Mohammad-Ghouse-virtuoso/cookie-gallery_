import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import GiftForm from './GiftForm';
import { useGiftExperience } from '@/context/GiftExperienceContext';
import { getGoldenSeasonBox } from '@/data/goldenSeasonBoxes';

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(element => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

function useFocusTrap(active: boolean, ref: RefObject<HTMLDivElement | null>, onEscape: () => void) {
  useEffect(() => {
    if (!active || !ref.current) {
      return;
    }
    const node = ref.current;
    const focusables = getFocusableElements(node);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab' || focusables.length === 0) {
        return;
      }
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (current === first || !current) {
          event.preventDefault();
          last?.focus();
        }
      } else if (current === last || !current) {
        event.preventDefault();
        first?.focus();
      }
    };

    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape, ref]);
}

export default function GiftModal() {
  const { state, closeModal, toast, clearToast } = useGiftExperience();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  const selectedBox = useMemo(() => getGoldenSeasonBox(state.selectedBoxKey ?? undefined), [state.selectedBoxKey]);

  useFocusTrap(state.isModalOpen, modalRef, () => {
    closeModal(true);
  });

  useEffect(() => {
    if (!state.isModalOpen) {
      setCursorOffset({ x: 0, y: 0 });
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [state.isModalOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => clearToast(), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast, clearToast]);

  const handleDismiss = (options?: { canceled?: boolean }) => {
    closeModal(options?.canceled);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!modalRef.current) return;
    const bounds = modalRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    setCursorOffset({ x: (x - 0.5) * 6, y: (y - 0.5) * 6 });
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) {
    return null;
  }

  const heroImageSrc = selectedBox?.previewImage;
  const heroAlt = selectedBox?.previewAlt ?? 'Cookie gift box ready to ship';

  return createPortal(
    <>
      <AnimatePresence>
        {state.isModalOpen && (
          <motion.div
            key="gift-modal"
            className="fixed inset-0 z-[120] flex items-center justify-center px-2 py-6 sm:px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-[rgba(31,21,14,0.55)]"
              aria-hidden="true"
              onClick={() => handleDismiss({ canceled: true })}
            />
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="gift-modal-title"
              aria-describedby="gift-modal-description"
              className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[rgba(226,185,127,0.32)] bg-[#FFF6F0] shadow-[0_36px_96px_-48px_rgba(31,21,14,0.65)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              onMouseMove={handleMouseMove}
            >
              <button
                type="button"
                onClick={() => handleDismiss({ canceled: true })}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#3B2B1A] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
                aria-label="Close gift experience"
              >
                ×
              </button>
              <div className="relative bg-gradient-to-r from-[#FDE7D7] via-[#F9D9BE] to-[#F4CFAE] px-6 pt-10 pb-8 sm:px-10">
                {heroImageSrc && (
                  <motion.img
                    src={heroImageSrc}
                    alt={heroAlt}
                    loading="lazy"
                    className="absolute -top-12 left-6 hidden h-36 w-36 rounded-3xl object-cover shadow-[0_32px_60px_-40px_rgba(31,21,14,0.65)] sm:block"
                    animate={{ x: cursorOffset.x, y: cursorOffset.y }}
                    transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                  />
                )}
                <p
                  id="gift-modal-description"
                  className="text-xs uppercase tracking-[0.36em] text-[#8E7360]"
                >
                  Golden Season Gifting
                </p>
                <h1
                  id="gift-modal-title"
                  className="mt-3 text-[2.2rem] font-semibold text-[#3B2B1A]"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  Make Someone Smile
                </h1>
                <p className="mt-3 max-w-xl text-sm text-[#6B5E57]">
                  Add your personal note, delivery details and we’ll wrap the limited box with satin ribbons.
                </p>
              </div>
              <div className="max-h-[80vh] overflow-y-auto px-6 pb-8 sm:px-10">
                <GiftForm
                  box={selectedBox}
                  mode="modal"
                  onRequestClose={handleDismiss}
                  headingId="gift-modal-title"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="fixed bottom-6 left-1/2 z-[130] -translate-x-1/2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            <div className="rounded-full bg-[#3B2B1A] px-5 py-2 text-sm font-medium text-[#FFF6F0] shadow-lg">
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    portalTarget,
  );
}
