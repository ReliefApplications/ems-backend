import permissionsRoutes from '@routes/permissions';
import { ENRICHED_ATTRIBUTES } from '@utils/user/enrichUserAttributes';
import config from 'config';
import express, { NextFunction, Request, Response } from 'express';
import supertest from 'supertest';

jest.mock('@services/logger.service');
jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn(),
    util: {
      getEnv: jest.fn((settings: string) => {
        return settings ? 'development' : 'production';
      }),
    },
  };
});

/**
 * Build a minimal express app mounting the permissions routes, with a stubbed
 * translation function since the real i18next middleware is not loaded here.
 *
 * @returns Express application
 */
const buildApp = () => {
  const app = express();
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).t = (key: string) => key;
    next();
  });
  app.use('/permissions', permissionsRoutes);
  return app;
};

/**
 * Mock the configured attribute list returned by config.
 *
 * @param list Value returned for the user.attributes.list setting
 */
const mockAttributeList = (list: any) => {
  (config.get as jest.Mock).mockImplementation((setting: string) => {
    if (setting === 'user.attributes.list') {
      return list;
    }
  });
};

const request = supertest(buildApp());

describe('Permissions routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /permissions/attributes', () => {
    const configured = [
      { value: 'department', text: 'Department' },
      { value: 'occupation', text: 'Occupation' },
    ];

    it('should only return configured attributes by default', async () => {
      mockAttributeList(configured);

      const response = await request.get('/permissions/attributes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(configured);
    });

    it('should include enriched attributes when enriched=true', async () => {
      mockAttributeList(configured);

      const response = await request.get(
        '/permissions/attributes?enriched=true'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([...configured, ...ENRICHED_ATTRIBUTES]);
    });

    it('should not duplicate a configured attribute also part of the enriched ones', async () => {
      const overlapping = { value: 'country.name', text: 'Custom country' };
      mockAttributeList([...configured, overlapping]);

      const response = await request.get(
        '/permissions/attributes?enriched=true'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        ...configured,
        overlapping,
        ...ENRICHED_ATTRIBUTES.filter((x) => x.value !== overlapping.value),
      ]);
    });

    it('should not include enriched attributes for other values of the parameter', async () => {
      mockAttributeList(configured);

      for (const value of ['false', '1', 'yes', '']) {
        const response = await request.get(
          `/permissions/attributes?enriched=${value}`
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual(configured);
      }
    });

    it('should default to an empty list when no attributes are configured', async () => {
      mockAttributeList(undefined);

      const response = await request.get('/permissions/attributes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should only return enriched attributes when none are configured and enriched=true', async () => {
      mockAttributeList(undefined);

      const response = await request.get(
        '/permissions/attributes?enriched=true'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual([...ENRICHED_ATTRIBUTES]);
    });

    it('should return 500 if reading the configuration fails', async () => {
      (config.get as jest.Mock).mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const response = await request.get('/permissions/attributes');

      expect(response.status).toBe(500);
    });
  });
});
