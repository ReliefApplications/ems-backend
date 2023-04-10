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
  describe('Many requests', () => {
    test('Should send an error when limit is reached', async () => {
      const rateLimit = Number(config.get('server.rateLimit.max'));
      for (let i = 0; i < rateLimit; i++) {
        const response = await request.get('');
        expect(response.status).toBe(200);
      }
      const response = await request.get('');
      expect(response.status).toBe(429);
    });
  });
});
