import rateLimit from 'express-rate-limit';
import config from 'config';

/** Internal REquest IP */
const INTERNAL_REQUEST_IP = '::ffff:127.0.0.1';

/**
 * Rate limit middleware. Prevent a IP to call too many times the API.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: config.get('server.rateLimit.windowMs'),
  max: config.get('server.rateLimit.max'),
  skip: (req, res) => {
    console.log(req.ip);
    console.log(req.ip === INTERNAL_REQUEST_IP);
    return req.ip === INTERNAL_REQUEST_IP;
  },
});
