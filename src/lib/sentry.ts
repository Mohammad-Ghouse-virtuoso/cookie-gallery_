import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend error tracking
 */
export function initSentry() {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
  
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development
      if (ENVIRONMENT === 'development') {
        console.log('Sentry Event (dev):', event);
        return null;
      }

      // Filter out Firebase auth errors (too noisy)
      const error = hint.originalException as Error;
      if (error?.message?.includes('Firebase') || error?.message?.includes('auth/')) {
        return null;
      }

      // Scrub sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
      }

      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ],
  });

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { uid: string; email?: string | null }) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  
  Sentry.setUser({
    id: user.uid,
    email: user.email || undefined,
  });
}

/**
 * Clear user context (on sign out)
 */
export function clearSentryUser() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Capture custom event
 */
export function captureEvent(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.log(`[${level}] ${message}`, extra);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    extra,
  });
}

/**
 * Capture exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.error('Exception:', error, context);
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
}

export { Sentry };
