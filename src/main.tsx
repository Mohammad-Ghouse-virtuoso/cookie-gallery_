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
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        const scrubbed = { ...event.request.data };
        ['cardNumber', 'card_number', 'paymentMethodId'].forEach(key => {
          if (scrubbed[key]) {
            scrubbed[key] = '***';
          }
        });
        event.request.data = scrubbed;
      }
      if (event.extra) {
        ['cardNumber', 'card_number', 'token'].forEach(key => {
          if (event.extra[key]) {
            event.extra[key] = '***';
          }
        });
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
    <App />
  </Sentry.ErrorBoundary>
)
