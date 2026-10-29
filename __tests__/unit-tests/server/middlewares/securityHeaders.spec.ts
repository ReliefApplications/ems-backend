import express from 'express';
import request from 'supertest';
import {
  buildSecurityHeaders,
  noStoreMiddleware,
} from '@server/middlewares/securityHeaders';

/**
 * Builds a minimal app answering with the given middlewares.
 *
 * @param production whether the server runs in production
 * @returns express app
 */
const buildApp = (production: boolean) => {
  const app = express();
  app.use(buildSecurityHeaders(production));
  app.use(noStoreMiddleware);
  app.get('/', (req, res) => res.json({ ok: true }));
  return app;
};

describe('securityHeaders', () => {
  it('sets the hardening headers', async () => {
    const res = await request(buildApp(true)).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('forbids all content in production', async () => {
    const res = await request(buildApp(true)).get('/');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'"
    );
  });

  it('leaves the content security policy out elsewhere, for the Apollo landing page', async () => {
    const res = await request(buildApp(false)).get('/');
    expect(res.headers['content-security-policy']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
