import { Form, Record, Resource, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import uploadRoutes from '@routes/upload';
import { getNextId } from '@utils/form';
import { Workbook } from 'exceljs';
import express, { NextFunction, Request, Response } from 'express';
import fileUpload from 'express-fileupload';
import i18next from 'i18next';
import { Types } from 'mongoose';
import supertest from 'supertest';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const en = require('../../../../src/i18n/en.json');

jest.mock('@services/logger.service');

// Mock getNextId only, as it relies on Redis
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
  getNextId: jest.fn(),
}));

/**
 * Build a user stub with a single role and its base ability, mirroring the
 * shape `insertRecords` expects on `context.user`.
 *
 * @param roleId Id of the user role
 * @returns user stub
 */
const buildUser = (roleId: Types.ObjectId): User => {
  const user = {
    _id: new Types.ObjectId(),
    name: 'Test User',
    username: 'test@user.com',
    roles: [{ _id: roleId, permissions: [] }],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

/**
 * Build an in-memory .xlsx file buffer with the given header row and data rows.
 *
 * @param headers header row values
 * @param rows data row values
 * @returns xlsx file content as a Buffer
 */
const buildXlsxBuffer = async (
  headers: string[],
  rows: any[][]
): Promise<Buffer> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

let currentUser: User;

/**
 * Build a minimal express app mounting the upload routes, with file-upload
 * middleware (matching production wiring) and a stubbed context reading the
 * module-scoped `currentUser` so each test can act as a different user.
 *
 * @returns Express application
 */
const buildApp = () => {
  const app = express();
  app.use(fileUpload());
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).t = (key: string) => key;
    (req as any).context = { user: currentUser };
    next();
  });
  app.use('/upload', uploadRoutes);
  return app;
};

let databaseHelpers: DatabaseHelpers;
let request: supertest.SuperTest<supertest.Test>;
let authorizedRoleId: Types.ObjectId;
let unauthorizedRoleId: Types.ObjectId;
let form: Form;
let nextIdCounter: number;

describe('Upload routes', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
    await i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: { translation: en } },
    });
    request = supertest(buildApp());

    authorizedRoleId = new Types.ObjectId();
    unauthorizedRoleId = new Types.ObjectId();

    const resource = await Resource.create({
      name: 'Upload resource',
      permissions: {
        canUploadRecords: [{ role: authorizedRoleId }],
      },
      fields: [{ name: 'description', type: 'text' }],
    });
    form = await Form.create({
      name: 'Upload form',
      graphQLTypeName: 'UploadForm',
      resource: resource._id,
      core: true,
      fields: [{ name: 'description', type: 'text' }],
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    nextIdCounter = 0;
    (getNextId as jest.Mock).mockImplementation(async () => {
      nextIdCounter += 1;
      return `2026-P${String(nextIdCounter).padStart(8, '0')}`;
    });
    currentUser = buildUser(authorizedRoleId);
  });

  afterEach(async () => {
    await Record.deleteMany({ form: form._id });
  });

  describe('POST /upload/form/records/:id', () => {
    it('inserts records with server-generated ids when there is no _id column', async () => {
      const buffer = await buildXlsxBuffer(
        ['description'],
        [['first'], ['second']]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(200);
      expect(getNextId).toHaveBeenCalledTimes(2);
      const records = await Record.find({ form: form._id }).sort({
        'data.description': 1,
      });
      expect(records).toHaveLength(2);
      expect(records[0].data.description).toEqual('first');
      expect(records[1].data.description).toEqual('second');
    });

    it('inserts records using the provided custom _id for every row', async () => {
      const id1 = new Types.ObjectId().toString();
      const id2 = new Types.ObjectId().toString();
      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [
          [id1, 'first'],
          [id2, 'second'],
        ]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(200);
      const record1 = await Record.findById(id1);
      const record2 = await Record.findById(id2);
      expect(record1).not.toBeNull();
      expect(record1.data.description).toEqual('first');
      expect(record1.form.toString()).toEqual(form.id);
      expect(record1.incrementalId).toBeDefined();
      expect(record1.createdBy.user.toString()).toEqual(
        currentUser._id.toString()
      );
      expect(record2).not.toBeNull();
      expect(record2.data.description).toEqual('second');
    });

    it('rejects the whole upload when a row has an invalid _id format, and does not consume incremental ids', async () => {
      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [['not-a-valid-object-id', 'first']]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(400);
      expect(response.text).toEqual(
        i18next.t('routes.upload.errors.invalidCustomId', {
          row: 2,
          value: 'not-a-valid-object-id',
        })
      );
      expect(getNextId).not.toHaveBeenCalled();
      expect(await Record.countDocuments({ form: form._id })).toEqual(0);
    });

    it('rejects the whole upload when an _id is duplicated within the file', async () => {
      const id = new Types.ObjectId().toString();
      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [
          [id, 'first'],
          [id, 'second'],
        ]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(400);
      expect(response.text).toEqual(
        i18next.t('routes.upload.errors.duplicateCustomId', {
          row: 3,
          value: id,
        })
      );
      expect(getNextId).not.toHaveBeenCalled();
      expect(await Record.countDocuments({ form: form._id })).toEqual(0);
    });

    it('rejects the whole upload when an _id already exists in the database, including archived records', async () => {
      const existingId = new Types.ObjectId();
      await Record.create({
        _id: existingId,
        incrementalId: 'EXISTING-0000001',
        form: form._id,
        data: { description: 'already there' },
        archived: true,
        _form: { _id: form._id, name: form.name },
      });

      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [[existingId.toString(), 'first']]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(400);
      expect(response.text).toEqual(
        i18next.t('routes.upload.errors.existingCustomId', {
          row: 2,
          value: existingId.toString(),
        })
      );
      expect(getNextId).not.toHaveBeenCalled();
    });

    it('rejects the whole upload when an _id cell is empty', async () => {
      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [['', 'first']]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(400);
      expect(response.text).toEqual(
        i18next.t('routes.upload.errors.invalidCustomId', {
          row: 2,
          value: '',
        })
      );
      expect(getNextId).not.toHaveBeenCalled();
      expect(await Record.countDocuments({ form: form._id })).toEqual(0);
    });

    it('returns 403 for a user without upload permission, even with a valid _id column, without validating it', async () => {
      currentUser = buildUser(unauthorizedRoleId);
      const buffer = await buildXlsxBuffer(
        ['_id', 'description'],
        [[new Types.ObjectId().toString(), 'first']]
      );

      const response = await request
        .post(`/upload/form/records/${form.id}`)
        .attach('excelFile', buffer, 'test.xlsx');

      expect(response.status).toBe(403);
      expect(response.text).toEqual(
        i18next.t('common.errors.dataNotFound')
      );
      expect(getNextId).not.toHaveBeenCalled();
      expect(await Record.countDocuments({ form: form._id })).toEqual(0);
    });
  });
});
