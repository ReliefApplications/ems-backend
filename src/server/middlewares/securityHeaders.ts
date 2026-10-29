import { Request, RequestHandler } from 'express';
import helmet from 'helmet';

/** Directives that apply to every response, the landing page included */
const baseDirectives = {
  'frame-ancestors': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'object-src': ["'none'"],
};

/** Helmet options shared by both policies */
const sharedOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: false },
};

/**
 * Tells whether the request asks for the Apollo landing page: a GET on /graphql
 * from a browser, which prefers HTML over the GraphQL response types (same
 * negotiation as Apollo Server).
 *
 * @param req http request
 * @returns whether the response is the landing page
 */
export const isLandingPageRequest = (req: Request): boolean =>
  req.method === 'GET' &&
  /^\/graphql\/?$/.test(req.path) &&
  req.accepts([
    'application/json',
    'application/graphql-response+json',
    'text/html',
  ]) === 'text/html';

/**
 * Builds the security headers middleware.
 *
 * The API only serves JSON and file downloads, so the content security policy
 * forbids everything. The one HTML page is the Apollo landing page: its response
 * keeps frame-ancestors, base-uri, form-action and object-src but leaves out
 * default-src, as the page loads the sandbox from Apollo's CDN and ships its own
 * policy (a meta tag with a per-request nonce for scripts and styles, and an
 * allow-list for the CDN and the sandbox iframe).
 * The front-ends live on other origins and load some API resources directly (images,
 * downloads), so the cross-origin resource policy allows them.
 * HSTS does not include subdomains, the parent domains are not ours.
 *
 * @returns security headers middleware
 */
export const buildSecurityHeaders = (): RequestHandler => {
  const apiHeaders = helmet({
    ...sharedOptions,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { 'default-src': ["'none'"], ...baseDirectives },
    },
  });
  const landingPageHeaders = helmet({
    ...sharedOptions,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        // Apollo's meta tag sets the sources, the header cannot know its nonce
        'default-src':
          helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
        ...baseDirectives,
      },
    },
  });
  return (req, res, next) =>
    isLandingPageRequest(req)
      ? landingPageHeaders(req, res, next)
      : apiHeaders(req, res, next);
};

/** The security headers middleware */
export const securityHeadersMiddleware = buildSecurityHeaders();

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
