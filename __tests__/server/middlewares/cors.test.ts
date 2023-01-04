import { corsMiddleware } from '@server/middlewares';
import express from 'express';
import supertest from 'supertest';

const app = express();
app.use(corsMiddleware);

app.get('', (req, res) => {
  res.statusCode = 200;
  res.end();
});

const request = supertest(app);

describe('Cors middleware', () => {
  describe('Request without origin', () => {
    test('Should send error', async () => {
      const response = await request.get('');
      expect(response.status).not.toBe(200);
    });
  });
});
