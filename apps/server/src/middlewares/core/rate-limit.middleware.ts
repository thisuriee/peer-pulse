import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const message = process.env.RATE_LIMIT_MESSAGE || 'Too many requests, please try again later.';
const trustProxy = process.env.RATE_LIMIT_TRUST_PROXY === 'true';

export const globalRateLimiter = rateLimit({
  windowMs,
  max,
  message,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  message,
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveRateLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || '5', 10),
  message,
  standardHeaders: true,
  legacyHeaders: false,
});

export { trustProxy };
