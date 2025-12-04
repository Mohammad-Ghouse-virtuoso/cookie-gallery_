import { useState } from 'react';

export interface TestCardBannerProps {
  /** Whether to show the banner - useful for environment-based toggling */
  show?: boolean;
  /** Card number to display (defaults to Stripe test card) */
  cardNumber?: string;
  /** Additional info text (e.g., expiry, CVC hints) */
  hint?: string;
  /** Whether to allow dismissing the banner */
  dismissible?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Visual variant */
  variant?: 'info' | 'warning';
  /** Custom class name for positioning overrides */
  className?: string;
}

/**
 * A flexible info banner to inform users about test card usage.
 * Designed for demo/dev environments to guide users on test payments.
 */
export function TestCardBanner({
  show = true,
  cardNumber = '4242 4242 4242 4242',
  hint = 'Use any future date & any 3-digit CVC',
  dismissible = true,
  onDismiss,
  variant = 'info',
  className = '',
}: TestCardBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    } catch {
      // Fallback: select the text (clipboard API may fail in some contexts)
      const textArea = document.createElement('textarea');
      textArea.value = cardNumber.replace(/\s/g, '');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const variantStyles = {
    info: {
      bg: 'bg-[#EDF7F6]',
      border: 'border-[#6db3a5]/30',
      icon: 'text-[#6db3a5]',
      text: 'text-[#2D5A52]',
      cardBg: 'bg-[#6db3a5]/10',
      cardText: 'text-[#2D5A52]',
      copyBtn: 'text-[#6db3a5] hover:bg-[#6db3a5]/10',
      dismissBtn: 'text-[#6db3a5]/60 hover:text-[#6db3a5]',
    },
    warning: {
      bg: 'bg-[#FFF8E6]',
      border: 'border-[#E2B97F]/40',
      icon: 'text-[#C47A41]',
      text: 'text-[#6B5E57]',
      cardBg: 'bg-[#C47A41]/10',
      cardText: 'text-[#3B2B1A]',
      copyBtn: 'text-[#C47A41] hover:bg-[#C47A41]/10',
      dismissBtn: 'text-[#C47A41]/60 hover:text-[#C47A41]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`flex items-start gap-3 rounded-[12px] border ${styles.border} ${styles.bg} px-4 py-3 ${className}`}
      role="status"
      aria-live="polite"
      data-testid="test-card-banner"
    >
      {/* Info icon */}
      <svg
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div className="flex-1 space-y-1.5">
        <p className={`text-sm font-medium ${styles.text}`}>
          This is a demo store — use test card details below
        </p>
        
        <div className="flex flex-wrap items-center gap-2">
          <code
            className={`rounded-md ${styles.cardBg} px-2 py-1 font-mono text-sm font-semibold tracking-wide ${styles.cardText}`}
          >
            {cardNumber}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150 ${styles.copyBtn}`}
            aria-label="Copy card number to clipboard"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          </button>
        </div>

        {hint && (
          <p className={`text-xs ${styles.text} opacity-75`}>
            {hint}
          </p>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={`flex-shrink-0 rounded p-1 transition-colors duration-150 ${styles.dismissBtn}`}
          aria-label="Dismiss test card info"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TestCardBanner;
