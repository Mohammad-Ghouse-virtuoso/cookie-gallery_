/**
 * MaintenanceBanner - Quick toggle banner for site-wide notices
 * 
 * Usage: Import and add to App.tsx or any page layout
 * 
 * To enable:  Set SHOW_BANNER = true and update MESSAGE
 * To disable: Set SHOW_BANNER = false
 */

import React from 'react';

// ============================================
// 🚨 QUICK TOGGLE - Change this to show/hide
// ============================================
const SHOW_BANNER = false;

// Banner message - update as needed
const MESSAGE = "Payment is temporarily unavailable. Please explore our cookie collection — checkout will be back soon!";

// Banner style: 'warning' (amber) | 'error' (red) | 'info' (blue) | 'success' (green)
type BannerVariant = 'warning' | 'error' | 'info' | 'success';
const VARIANT: BannerVariant = 'warning';

// ============================================

const variantStyles: Record<BannerVariant, string> = {
  warning: 'bg-amber-500 text-amber-950',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  success: 'bg-green-600 text-white',
};

const icons: Record<BannerVariant, React.ReactNode> = {
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function MaintenanceBanner() {
  if (!SHOW_BANNER) return null;

  return (
    <div className={`${variantStyles[VARIANT]} px-4 py-3 text-center font-medium`}>
      <span className="inline-flex items-center gap-2">
        {icons[VARIANT]}
        {MESSAGE}
      </span>
    </div>
  );
}
