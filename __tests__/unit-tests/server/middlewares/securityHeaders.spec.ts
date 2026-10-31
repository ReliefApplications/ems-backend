import express from 'express';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import {
  buildSecurityHeaders,
  noStoreMiddleware,
} from '@server/middlewares/securityHeaders';

/** Content security policy of the API responses */
const API_CSP =
  "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none';object-src 'none'";

/** Content security policy of the landing page response */
const LANDING_PAGE_CSP =
  "frame-ancestors 'none';base-uri 'none';form-action 'none';object-src 'none'";

/** Apollo server serving the landing page */
let apolloServer: ApolloServer;

/** App under test */
let app: express.Express;

beforeAll(async () => {
  apolloServer = new ApolloServer({
    typeDefs: 'type Query { ok: Boolean }',
    resolvers: { Query: { ok: () => true } },
    plugins: [ApolloServerPluginLandingPageLocalDefault()],
  });
  await apolloServer.start();
  app = express();
  app.use(buildSecurityHeaders());
  app.use(noStoreMiddleware);
  app.use('/graphql', express.json(), expressMiddleware(apolloServer));
  app.get('/', (req, res) => res.json({ ok: true }));
});

afterAll(async () => {
  await apolloServer.stop();
});

describe('securityHeaders', () => {
  it('sets the hardening headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('forbids all content on API responses', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toBe(API_CSP);
  });

  it('forbids all content on GraphQL responses', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Accept', 'application/json')
      .send({ query: '{ ok }' });
    expect(res.body.data.ok).toBe(true);
    expect(res.headers['content-security-policy']).toBe(API_CSP);
  });

  it('lets the landing page load the sandbox under its own policy', async () => {
    const res = await request(app)
      .get('/graphql')
      .set('Accept', 'text/html,application/xhtml+xml,*/*;q=0.8');
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['content-security-policy']).toBe(LANDING_PAGE_CSP);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
    // Apollo's own policy restricts scripts and styles with a nonce
    expect(res.text).toMatch(
      /http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-/
    );
  });
});
