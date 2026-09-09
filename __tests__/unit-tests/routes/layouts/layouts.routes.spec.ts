import { createMongoAbility } from '@casl/ability';
import { Form } from '@models';
import layouts from '@routes/layouts';
import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

const buildApp = () => {
  const app = express();
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).t = (key: string) => key;
    (req as any).context = {
      user: {
        ability: createMongoAbility([{ action: 'read', subject: 'Form' }]),
      },
    };
    next();
  });
  app.use('/layouts', layouts);
  return app;
};

let databaseHelpers: DatabaseHelpers;
let request: supertest.SuperTest<supertest.Test>;
let resourceId: mongoose.Types.ObjectId;

describe('Layout routes', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    request = supertest(buildApp());
    resourceId = new mongoose.Types.ObjectId();

    await Form.create([
      {
        name: 'First form',
        graphQLTypeName: 'FirstLayoutForm',
        resource: resourceId,
        fields: [{ name: 'second' }, { name: 'first' }],
      },
      {
        name: 'Other resource form',
        graphQLTypeName: 'OtherResourceLayoutForm',
        resource: new mongoose.Types.ObjectId(),
        fields: [{ name: 'other' }],
      },
    ]);
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  describe('GET /layouts/resources/:id/forms', () => {
    it('returns forms and fields in their definition order', async () => {
      const response = await request.get(`/layouts/resources/${resourceId}` + '/forms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: 'First form',
        fields: ['second', 'first'],
      });
    });

    it('returns 404 for an invalid resource id', async () => {
      const response = await request.get('/layouts/resources/not-an-object-id/forms');

      expect(response.status).toBe(404);
    });
  });
});
