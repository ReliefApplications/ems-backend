import { rateLimitMiddleware } from '@server/middlewares';
import express from 'express';
import supertest from 'supertest';
import config from 'config';

/** This app for testing middleware */
const app = express();
app.use(rateLimitMiddleware);

app.get('', (req, res) => {
  res.statusCode = 200;
  res.end();
});
/** This supertest for testing middleware */
const request = supertest(app);

describe('rateLimit middleware', () => {
  test('Test send with single request', async () => {
    const response = await request.get('');
    expect(response.status).toBe(200);
  });
  test('Test send with many request in small time', async () => {
    for (let i = 0; i < config.get('server.rateLimit.max'); i++) {
      await request.get('');
    }
    const response = await request.get('');
    expect(response.status).toBe(429);
  });
});
