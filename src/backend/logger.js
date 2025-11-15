const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cookie-gallery-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  }));
}

function scrubSensitive(meta = {}) {
  const clone = { ...meta };
  ['cardNumber', 'card_number', 'token', 'authHeader', 'authorization'].forEach(key => {
    if (clone[key]) {
      clone[key] = '***';
    }
  });
  return clone;
}

logger.captureException = (error, context = {}) => {
  const err = error instanceof Error ? error : new Error(String(error));
  const safeContext = scrubSensitive(context);
  logger.error(err.message, { stack: err.stack, ...safeContext });
  if (global.Sentry) {
    global.Sentry.withScope(scope => {
      Object.entries(safeContext?.tags ?? {}).forEach(([key, value]) => scope.setTag(key, String(value)));
      Object.entries(safeContext?.extra ?? safeContext).forEach(([key, value]) => {
        if (key === 'tags') return;
        if (key === 'user') return;
        if (value !== undefined && value !== null) {
          scope.setExtra(key, value);
        }
      });
      if (safeContext?.user) {
        scope.setUser(safeContext.user);
      }
      scope.setLevel('error');
      global.Sentry.captureException(err);
    });
  }
};

module.exports = logger;
