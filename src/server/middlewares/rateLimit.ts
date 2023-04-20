import rateLimit from 'express-rate-limit';
import config from 'config';

/**
 * Rate limit middleware. Prevent a IP to call too many times the API.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: config.get('server.rateLimit.windowMs'),
  max: config.get('server.rateLimit.max'),
});
