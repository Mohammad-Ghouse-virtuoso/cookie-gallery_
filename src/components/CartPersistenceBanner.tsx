// src/components/CartPersistenceBanner.tsx

import { useState, useEffect } from 'react';

const BANNER_DISMISSED_KEY = 'cg-cart-banner-dismissed';

export default function CartPersistenceBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-[#FFF6EA] border-b border-[#E2B97F] shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <svg
            className="h-5 w-5 text-[#C47A41] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-[#7B5C3A]">
            <span className="font-semibold">Your cart is now saved!</span> Items will persist even if you refresh the page or close your browser.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="px-3 py-1 text-sm font-medium text-[#7B5C3A] hover:text-[#3B2B1A] transition-colors duration-200 flex-shrink-0"
          aria-label="Dismiss banner"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
