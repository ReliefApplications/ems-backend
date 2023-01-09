import { get, isNil } from 'lodash';

let mockConfig;

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      if (isNil(setting)) {
        throw new Error('null or undefined argument');
      }
      const value = get(mockConfig, setting, undefined);
      if (value === undefined) {
        throw new Error('configuration property is undefined');
      }
      return value;
    }),
  };
});

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
      mockConfig = {
        server: {
          allowedOrigins: ['http://allowed.com'],
        },
      };
      const response = await request
        .get('')
        .set('Origin', 'http://allowed.com');
      expect(response.status).toBe(200);
    });
  });
});
