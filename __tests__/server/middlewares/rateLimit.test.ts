import { rateLimitMiddleware } from '@server/middlewares';
import express from 'express';
import supertest from 'supertest';
import config from 'config';

/** Generate a basic application */
const app = express();
app.use(rateLimitMiddleware);

app.get('', (req, res) => {
  res.statusCode = 200;
  res.end();
});
/** Mock requests */
const request = supertest(app);

describe('RateLimit middleware', () => {
  describe('Single request', () => {
    test('Should pass', async () => {
      const response = await request.get('');
      expect(response.status).toBe(200);
    });
  });

  describe('Many requests', () => {
    test('Should send an error when limit is reached', async () => {
      for (let i = 0; i < config.get('server.rateLimit.max'); i++) {
        const response = await request.get('');
        expect(response.status).toBe(200);
      }
      const response = await request.get('');
      expect(response.status).toBe(429);
    });
  });
});
