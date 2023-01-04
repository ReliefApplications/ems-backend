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

beforeAll(async () => {
  jest.doMock('config', () => {
    const originalModule = jest.requireActual('config');
    return {
      __esModule: true,
      ...originalModule,
      get: (setting: string) => {
        if (setting === 'server.allowedOrigins') {
          return ['http://allowed.com'];
        } else {
          return undefined;
        }
      },
    };
  });
});

describe('Cors middleware', () => {
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
