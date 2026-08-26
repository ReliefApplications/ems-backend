import { Form, Record } from '@models';
import uploadRoutes from '@routes/upload';
import { Workbook } from 'exceljs';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

/** Test user with permission to upload records. */
const user = {
  _id: new mongoose.Types.ObjectId(),
  ability: {
    can: () => true,
  },
  name: 'Test user',
  roles: [],
  username: 'test.user',
};

/**
 * Build a minimal application with upload authentication context.
 *
 * @returns Express application
 */
const buildApp = () => {
  const app = express();
  app.use(fileUpload());
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as Request & { context: { user: typeof user } }).context = { user };
    next();
  });
  app.use('/upload', uploadRoutes);
  return app;
};

/** Build a valid XLSX buffer with one invalid resource reference. */
const buildInvalidResourceImport = async (): Promise<Buffer> => {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Records');
  worksheet.addRow(['linkedRecord']);
  worksheet.addRow(['not-a-resource-id']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

let databaseHelpers: DatabaseHelpers;
let request: supertest.SuperTest<supertest.Test>;
let form: Form;

describe('Upload routes', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    request = supertest(buildApp());
    form = await Form.create({
      fields: [
        {
          name: 'linkedRecord',
          resource: new mongoose.Types.ObjectId(),
          type: 'resource',
        },
      ],
      graphQLTypeName: 'ImportedRecords',
      name: 'Imported records',
      structure: { pages: [] },
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('rejects imports containing an invalid resource reference', async () => {
    const response = await request
      .post(`/upload/form/records/${form.id}`)
      .attach('excelFile', await buildInvalidResourceImport(), 'records.xlsx');

    expect(response.status).toBe(400);
    await expect(Record.countDocuments({ form: form._id })).resolves.toBe(0);
  });
});
