import notificationRoutes from '@routes/notification';
import axios from 'axios';
import config from 'config';
import express, { NextFunction, Request, Response } from 'express';
import supertest from 'supertest';

jest.mock('@models', () => ({
  EmailNotification: {
    findById: jest.fn(),
  },
}));
jest.mock('@services/logger.service');
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    isAxiosError: jest.fn(),
  },
}));
jest.mock('config', () => ({
  get: jest.fn(),
  util: {
    getEnv: jest.fn(() => 'test'),
  },
}));

/**
 * Build a minimal application containing the notification proxy.
 *
 * @returns Express application
 */
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.t = ((key: string) => key) as unknown as typeof req.t;
    next();
  });
  app.use('/notification', notificationRoutes);
  return app;
};

const request = supertest(buildApp());

describe('Notification proxy routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'email.serverless.url') {
        return 'http://localhost:7071/api';
      }
      if (key === 'email.serverless.key') {
        return '';
      }
      return undefined;
    });
  });

  it('preserves an Azure Function error status and body', async () => {
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    (axios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'No emails sent' },
      },
    });

    const response = await request
      .post('/notification/send-quick-email')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'No emails sent' });
  });

  it('returns an internal server error for failures without a response', async () => {
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
    (axios.post as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const response = await request
      .post('/notification/send-quick-email')
      .send({});

    expect(response.status).toBe(500);
    expect(response.text).toBe('common.errors.internalServerError');
  });

  it('preserves plain-text Azure Function errors on GET requests', async () => {
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    (axios.get as jest.Mock).mockRejectedValue({
      response: {
        status: 404,
        data: 'common.errors.dataNotFound',
      },
    });

    const response = await request.get('/notification/preview-email');

    expect(response.status).toBe(404);
    expect(response.type).toBe('text/plain');
    expect(response.text).toBe('common.errors.dataNotFound');
  });
});
