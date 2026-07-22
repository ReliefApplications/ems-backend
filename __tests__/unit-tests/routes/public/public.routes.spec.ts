import { status } from '@const/enumTypes';
import { Form } from '@models';
import publicRoutes from '@routes/public';
import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

/**
 * Build a minimal express app mounting the public routes, with a stubbed
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
  app.use('/public', publicRoutes);
  return app;
};

let databaseHelpers: DatabaseHelpers;
let request: supertest.SuperTest<supertest.Test>;
let publicForm: Form;
let privateForm: Form;

describe('Public routes', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    request = supertest(buildApp());
    publicForm = await Form.create({
      name: 'Public form',
      graphQLTypeName: 'PublicForm',
      status: status.active,
      isPublic: true,
      structure: { pages: [] },
      fields: [{ name: 'description', type: 'text' }],
      permissions: {
        canSee: [new mongoose.Types.ObjectId()],
      },
    });
    privateForm = await Form.create({
      name: 'Private form',
      graphQLTypeName: 'PrivateForm',
      status: status.active,
      structure: { pages: [] },
      fields: [],
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /public/forms/:id', () => {
    it('should return a form marked as public', async () => {
      const response = await request.get(`/public/forms/${publicForm.id}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toEqual(publicForm.id);
      expect(response.body.name).toEqual('Public form');
      expect(response.body.status).toEqual(status.active);
      expect(response.body.structure).toEqual({ pages: [] });
      expect(response.body.fields).toEqual([
        { name: 'description', type: 'text' },
      ]);
    });

    it('should not expose fields outside the public whitelist', async () => {
      const response = await request.get(`/public/forms/${publicForm.id}`);

      expect(response.status).toBe(200);
      expect(response.body.permissions).toBeUndefined();
      expect(response.body.isPublic).toBeUndefined();
      expect(response.body.graphQLTypeName).toBeUndefined();
    });

    it('should return 404 for a form not marked as public', async () => {
      const response = await request.get(`/public/forms/${privateForm.id}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for a non-existing form', async () => {
      const response = await request.get(
        `/public/forms/${new mongoose.Types.ObjectId()}`
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 for an invalid form id', async () => {
      const response = await request.get('/public/forms/not-an-object-id');

      expect(response.status).toBe(404);
    });

    it('should return 500 if the database query fails', async () => {
      jest.spyOn(Form, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request.get(`/public/forms/${publicForm.id}`);

      expect(response.status).toBe(500);
    });
  });
});
