import { corsMiddleware } from '@server/middlewares';
import express from 'express';
import supertest from 'supertest';
import config from 'config';

const app = express();
app.use(corsMiddleware);

app.get('', (req, res) => {
  res.statusCode = 200;
  res.end();
});

const request = supertest(app);

describe('Cors middleware', () => {
  jest.spyOn(config, 'get').mockImplementation((setting: string) => {
    console.log('=== called ===')
    if (setting === 'server.allowedOrigins') {
      return ['http://allowed.com'];
    } else {
      return undefined;
    }
  });

  describe('Request without origin', () => {
    test('Should return', async () => {
      const response = await request.get('');
      expect(response.status).toBe(200);
    });
  });

  describe('Request with incorrect origin', () => {
    test('Should not return', async () => {
      const response = await request
        .get('')
        .set('Origin', 'http://not-allowed.com');
      expect(response.status).not.toBe(200);
      expect(response.status).toBe(500);
    });
  });

  describe('Request with correct origin', () => {
    test('Should return', async () => {
      const response = await request
        .get('')
        .set('Origin', 'http://allowed.com');
      expect(response.status).toBe(200);
    });
  });
});
