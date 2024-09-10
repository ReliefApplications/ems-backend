import { get, isNil } from 'lodash';
import { faker } from '@faker-js/faker';

/** Generate a random url */
const url = faker.internet.url();

/** Test configuration */
const mockConfig = {
  server: {
    url: 'mock',
    allowedOrigins: [url],
  },
  frontOffice: {
    uri: 'mock',
  },
  backOffice: {
    uri: 'mock',
  },
  database: {
    provider: 'mock',
    prefix: 'mock',
    host: 'mock',
    port: 'mock',
    name: 'mock',
    user: 'mock',
    pass: 'mock',
  },
  auth: {
    url: 'mock',
    clientId: 'mock',
    realm: 'mock',
    provider: 'mock',
    allowedIssuers: [],
  },
};

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      if (isNil(setting)) {
        throw new Error('null or undefined argument');
      }
      const value = get(mockConfig, setting, '');
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

/** Generate a basic application */
const app = express();
app.use(corsMiddleware);
app.get('', (req, res) => {
  res.statusCode = 200;
  res.end();
});
/** Mock requests */
const request = supertest(app);

describe('Cors middleware', () => {
  describe('Request without origin', () => {
    test('Should work', async () => {
      const response = await request.get('');
      expect(response.status).toBe(200);
    });
  });

  describe('Request with invalid origin', () => {
    test('Should not work', async () => {
      const response = await request
        .get('')
        .set('Origin', 'http://not-allowed.com');
      expect(response.status).not.toBe(200);
      expect(response.status).toBe(500);
    });
  });

  describe('Request with valid origin', () => {
    test('Should work', async () => {
      const response = await request.get('').set('Origin', url);
      expect(response.status).toBe(200);
    });
  });
});
