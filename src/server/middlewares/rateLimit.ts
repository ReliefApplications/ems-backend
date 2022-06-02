import rateLimit from 'express-rate-limit';

/**
 * Rate limit middleware. Prevent a IP to call too many times the API.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
});
