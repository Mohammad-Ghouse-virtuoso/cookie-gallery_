import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { CookieData } from '../data/cookies';

type Props = { cookie: CookieData | null; onClose: () => void };

export default function CookieDetailsModal({ cookie, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (cookie) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Prevent scroll
      document.body.style.overflow = 'hidden';
      
      // Compensate for scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
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

  if (!cookie) return null;

  const n = cookie.nutrition || {} as CookieData['nutrition'];
  const val = (v: number | null | undefined, suffix = '') =>
    v === null || v === undefined ? '—' : `${v}${suffix}`;

  return (
    <AnimatePresence>
      <motion.div
        key={cookie.id}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          ref={modalRef}
          className="bg-white w-full max-w-[720px] max-h-[90vh] overflow-y-auto"
          style={{
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-medium)'
          }}
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: 'var(--space-xl)' }}>
            {/* Close button - NO OUTLINE */}
            <button
              onClick={onClose}
              className="absolute w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              style={{
                top: 'var(--space-md)',
                right: 'var(--space-md)',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                outline: 'none',
                transition: 'all var(--duration-small) ease'
              }}
              aria-label="Close modal"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col sm:flex-row" style={{ gap: 'var(--space-lg)' }}>
              {/* Image Section */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <img 
                  src={cookie.src} 
                  alt={cookie.name}
                  loading="lazy"
                  srcSet={`${cookie.src} 1x`}
                  className="object-cover"
                  style={{
                    width: '192px',
                    height: '192px',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-light)'
                  }}
                />
              </div>

              {/* Content Section */}
              <div className="flex-1">
                <h2 
                  id="modal-title" 
                  className="text-2xl sm:text-3xl font-bold text-[#5b3a20]"
                  style={{ marginBottom: 'var(--space-sm)' }}
                >
                  {cookie.name}
                </h2>
                <p 
                  className="text-base text-gray-600"
                  style={{ marginBottom: 'var(--space-md)' }}
                >
                  {cookie.description}
                </p>

                {cookie.dietPreference && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <span 
                      className="inline-flex items-center text-[#5b3a20] border px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: 'var(--color-bg-beige)',
                        borderColor: 'var(--color-accent-beige)',
                        borderRadius: 'var(--radius-pill)'
                      }}
                    >
                      {cookie.dietPreference}
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <span className="text-2xl font-bold text-[#5b3a20]">₹{cookie.price}</span>
                </div>

                {/* Nutrition Section */}
                <div 
                  className="border-t border-gray-200"
                  style={{ paddingTop: 'var(--space-md)' }}
                >
                  <h3 
                    className="text-sm font-semibold text-gray-500 uppercase tracking-wide"
                    style={{ marginBottom: 'var(--space-md)' }}
                  >
                    Nutrition (per 100g)
                  </h3>
                  <dl 
                    className="grid grid-cols-2 text-sm"
                    style={{ 
                      gap: 'var(--space-md) var(--space-md)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Energy</dt>
                      <dd className="font-semibold text-[#5b3a20]">{val(n.energy, ' kcal')}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Protein</dt>
                      <dd className="font-semibold text-[#5b3a20]">{val(n.protein, ' g')}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Total Fat</dt>
                      <dd className="font-semibold text-[#5b3a20]">{val(n.totalFat, ' g')}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Total Carbs</dt>
                      <dd className="font-semibold text-[#5b3a20]">{val(n.totalCarbs, ' g')}</dd>
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <dt className="text-gray-600">Total Sugar</dt>
                      <dd className="font-semibold text-[#5b3a20]">{val(n.totalSugar, ' g')}</dd>
                    </div>
                  </dl>
                </div>

                {/* Allergens Section */}
                {cookie.allergens && cookie.allergens.length > 0 && (
                  <div 
                    className="border-t border-gray-200"
                    style={{ 
                      marginTop: 'var(--space-md)',
                      paddingTop: 'var(--space-md)'
                    }}
                  >
                    <h4 
                      className="text-sm font-semibold text-gray-500 uppercase tracking-wide"
                      style={{ marginBottom: 'var(--space-sm)' }}
                    >
                      Allergens
                    </h4>
                    <div className="flex flex-wrap" style={{ gap: 'var(--space-sm)' }}>
                      {cookie.allergens.map((a, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
                          style={{ borderRadius: 'var(--radius-pill)' }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              className="w-full bg-[#5b3a20] text-white font-semibold py-3 hover:bg-[#3a2310] hover:-translate-y-0.5 active:scale-98 transition-all"
              style={{
                marginTop: 'var(--space-lg)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-light)',
                transition: 'all var(--duration-small) ease',
                border: 'none',
                outline: 'none'
              }}
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
