// src/main.tsx
import App from "./App";
import './index.css'
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  ?? import.meta.env.VITE_SENTRY_DSN_FRONTEND
  ?? import.meta.env.SENTRY_DSN_FRONTEND;

if (sentryDsn) {
  const release = import.meta.env.VITE_SENTRY_RELEASE
    ?? (import.meta.env.VITE_APP_VERSION ? `cookie-gallery@${import.meta.env.VITE_APP_VERSION}` : undefined);
  const environment = import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE ?? 'development';
  const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_SAMPLE_RATE ?? 0.1);

  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    beforeSend(event) {
      // remove sensitive headers if present
      if (event.request?.headers && typeof event.request.headers === 'object') {
        const headers = event.request.headers as Record<string, any>;
        delete headers['authorization'];
        delete headers['cookie'];
      }

      // scrub sensitive fields in request.data if it's an object
      if (event.request?.data && typeof event.request.data === 'object') {
        const scrubbed = { ...(event.request.data as Record<string, any>) };
        ['cardNumber', 'card_number', 'paymentMethodId'].forEach(key => {
          if (Object.prototype.hasOwnProperty.call(scrubbed, key) && scrubbed[key]) {
            scrubbed[key] = '***';
          }
        });
        event.request.data = scrubbed;
      }

      // scrub sensitive fields in event.extra if it's an object
      if (event.extra && typeof event.extra === 'object') {
        const extra = event.extra as Record<string, any>;
        ['cardNumber', 'card_number', 'token'].forEach(key => {
          if (Object.prototype.hasOwnProperty.call(extra, key) && extra[key]) {
            extra[key] = '***';
          }
        });
        // assign back in case event.extra was not a plain object
        event.extra = extra;
      }

      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
    <App />
  </Sentry.ErrorBoundary>
);
