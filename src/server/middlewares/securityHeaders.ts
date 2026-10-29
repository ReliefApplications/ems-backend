import { RequestHandler } from 'express';
import helmet from 'helmet';
import { isProduction } from '../apollo/formatError';

/**
 * Builds the security headers middleware.
 *
 * The API only serves JSON and file downloads, never HTML, so the content security
 * policy forbids everything. Outside production, the policy is left out so the Apollo
 * landing page (which loads the sandbox from Apollo's CDN) keeps working; the landing
 * page itself is disabled in production.
 * The front-ends live on other origins and load some API resources directly (images,
 * downloads), so the cross-origin resource policy allows them.
 * HSTS does not include subdomains, the parent domains are not ours.
 *
 * @param production whether the server runs in production
 * @returns security headers middleware
 */
export const buildSecurityHeaders = (production: boolean): RequestHandler =>
  helmet({
    contentSecurityPolicy: production
      ? {
          useDefaults: false,
          directives: {
            'default-src': ["'none'"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'none'"],
            'form-action': ["'none'"],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false },
  });

/** The security headers middleware */
export const securityHeadersMiddleware = buildSecurityHeaders(isProduction);

/**
 * Prevents browsers and proxies (Azure Front Door) from storing API responses,
 * which carry user data.
 *
 * @param req http request
 * @param res http response
 * @param next next middleware
 */
export const noStoreMiddleware: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
