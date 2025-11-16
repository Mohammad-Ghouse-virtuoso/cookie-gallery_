const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('../logger');

/**
 * Initialize Sentry for backend error tracking
 */
function initSentry(app) {
  const SENTRY_DSN = process.env.SENTRY_DSN_BACKEND || process.env.SENTRY_DSN;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  if (!SENTRY_DSN) {
    logger.warn('Sentry DSN not configured. Error tracking disabled.');
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
      nodeProfilingIntegration(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1,
    
    // Profiling
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 0.5,
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send in development
      if (NODE_ENV === 'development') {
        logger.debug('Sentry Event (dev):', { event, error: hint.originalException });
        return null;
      }

      // Scrub sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        
        // Remove sensitive query params
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string.replace(
            /([?&])(token|key|secret|password)=[^&]*/gi,
            '$1$2=***'
          );
        }
      }

      // Scrub sensitive extra data
      if (event.extra) {
        ['password', 'token', 'secret', 'apiKey', 'private_key', 'card_number', 'card_last4'].forEach(key => {
          if (event.extra[key]) {
            event.extra[key] = '***';
          }
        });
      }

      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'socket hang up',
    ],
  });

  // Make Sentry globally available
  global.Sentry = Sentry;

  logger.info(`Sentry initialized for ${NODE_ENV} environment`);
  return Sentry;
}

/**
 * Express error handler middleware
 */
function sentryErrorHandler() {
  if (!Sentry.Handlers) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send errors with status 500+
      return error.status >= 500 || !error.status;
    },
  });
}

/**
 * Request handler middleware
 */
function sentryRequestHandler() {
  if (!Sentry.Handlers) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Tracing middleware
 */
function sentryTracingHandler() {
  if (!Sentry.Handlers) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Create a scoped capture with tags, extras and user context.
 */
function withScope({ tags = {}, extra = {}, user = null } = {}, callback = () => {}) {
  if (!global.Sentry) {
    return callback();
  }

  return global.Sentry.withScope(scope => {
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        scope.setTag(key, String(value));
      }
    });
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        scope.setExtra(key, value);
      }
    });
    if (user) {
      scope.setUser(user);
    }
    return callback(scope);
  });
}

/**
 * Capture exception with context
 */
function captureException(error, context = {}) {
  if (!global.Sentry) {
    logger.error('Exception (Sentry not initialized):', { error, context });
    return;
  }

  const { tags, extra, level, user } = context;
  withScope({ tags, extra, user }, () => {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      level: level || 'error',
    });
  });
}

/**
 * Capture custom message
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!global.Sentry) {
    logger[level](`Message (Sentry not initialized): ${message}`, context);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 */
function setUser(user) {
  if (!global.Sentry) return;
  
  Sentry.setUser(user ? {
    id: user.uid || user.id,
    email: user.email,
  } : null);
}

/**
 * Add breadcrumb
 */
function addBreadcrumb(breadcrumb) {
  if (!global.Sentry) return;
  
  Sentry.addBreadcrumb(breadcrumb);
}

module.exports = {
  initSentry,
  sentryErrorHandler,
  sentryRequestHandler,
  sentryTracingHandler,
  withScope,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  Sentry,
};
