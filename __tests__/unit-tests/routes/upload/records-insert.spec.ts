import express from 'express';
import fileUpload from 'express-fileupload';
import request from 'supertest';
import { Types } from 'mongoose';
import { Workbook } from 'exceljs';
import { Form, Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { insertRecords } from '@server/pullJobScheduler';
import { getUploadColumns, loadRow, uploadFile } from '@utils/files';
import { validateBatchUniqueness, validateUniqueness } from '@utils/form';
import upload from '@routes/upload';

jest.mock('@models');
jest.mock('@services/logger.service');
jest.mock('@security/extendAbilityForRecords');
jest.mock('@server/pullJobScheduler', () => ({ insertRecords: jest.fn() }));
jest.mock('@utils/files');
jest.mock('@utils/form', () => ({
  getNextId: jest.fn(),
  validateBatchUniqueness: jest.fn(),
  validateUniqueness: jest.fn(),
}));
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/** Target form */
const FORM_ID = new Types.ObjectId().toHexString();

/**
 * Mount the upload router behind a middleware injecting the logged principal.
 *
 * @param user user or client to inject in the request context
 * @returns express app
 */
const buildApp = (user: any) => {
  const app = express();
  app.use(express.json());
  app.use(fileUpload());
  app.use((req: any, _res, next) => {
    req.context = { user };
    req.t = (key: string) => key;
    next();
  });
  app.use('/upload', upload);
  return app;
};

/**
 * Makes the (mocked) record ability grant the given actions.
 *
 * @param actions actions granted on records
 */
const grant = (actions: string[]) => {
  (extendAbilityForRecords as jest.Mock).mockResolvedValue({
    can: jest.fn((action: string) => actions.includes(action)),
    cannot: jest.fn((action: string) => !actions.includes(action)),
  });
};

/** Client application principal (no email / name claims) */
const client = {
  _id: new Types.ObjectId(),
  name: 'pull-function',
  roles: [],
  ability: {},
};

/** Valid insert body, as sent by the pull function */
const insertBody = () => ({
  records: [{ EventID: 1, Title: 'Outbreak' }],
  parameters: {
    name: 'Events',
    convertTo: FORM_ID,
    uniqueIdentifiers: ['EventID'],
    mapping: { event_id: 'EventID', title: 'Title' },
    evaluateExpressions: true,
  },
});

/**
 * Builds a one-row xlsx file.
 *
 * @returns xlsx buffer
 */
const buildXlsx = async (): Promise<Buffer> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('records');
  sheet.addRow(['title']);
  sheet.addRow(['first record']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

describe('Upload routes - record insertion (H-03)', () => {
  const form = { _id: FORM_ID, id: FORM_ID, name: 'Events', fields: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    (Form.findById as jest.Mock).mockResolvedValue(form);
    (insertRecords as jest.Mock).mockResolvedValue('1 new records created');
    // No uniqueness rule violated by default
    (validateBatchUniqueness as jest.Mock).mockImplementation((rows: any[]) =>
      rows.map(() => ({ errors: [], warnings: [] }))
    );
    (validateUniqueness as jest.Mock).mockResolvedValue({
      errors: [],
      warnings: [],
    });
  });

  describe('POST /upload/resource/insert', () => {
    it('refuses a principal that cannot create records of the target form', async () => {
      grant([]);
      const res = await request(buildApp(client))
        .post('/upload/resource/insert')
        .send(insertBody());
      expect(res.status).toBe(403);
      expect(res.text).toBe('common.errors.permissionNotGranted');
      expect(extendAbilityForRecords).toHaveBeenCalledWith(client, form);
      expect(insertRecords).not.toHaveBeenCalled();
    });

    it('inserts the records for a principal allowed to create records of the form', async () => {
      grant(['create']);
      const body = insertBody();
      const res = await request(buildApp(client))
        .post('/upload/resource/insert')
        .send(body);
      expect(res.status).toBe(200);
      expect(res.text).toBe('1 new records created');
      expect(Form.findById).toHaveBeenCalledWith(FORM_ID);
      expect(insertRecords).toHaveBeenCalledWith(
        body.records,
        body.parameters,
        true,
        true,
        true
      );
    });

    it('also accepts a user allowed to create records, whatever the token claims', async () => {
      grant(['create']);
      const user = { ...client, username: 'someone@who.int' };
      const res = await request(buildApp(user))
        .post('/upload/resource/insert')
        .set('Authorization', 'Bearer user-token')
        .send(insertBody());
      expect(res.status).toBe(200);
      expect(extendAbilityForRecords).toHaveBeenCalledWith(user, form);
    });

    it('returns 404 when the target form does not exist', async () => {
      grant(['create']);
      (Form.findById as jest.Mock).mockResolvedValue(null);
      const res = await request(buildApp(client))
        .post('/upload/resource/insert')
        .send(insertBody());
      expect(res.status).toBe(404);
      expect(insertRecords).not.toHaveBeenCalled();
    });

    const malformed: [any, string][] = [
      [{}, 'empty body'],
      [
        { records: 'x', parameters: insertBody().parameters },
        'records not a list',
      ],
      [{ records: [{}] }, 'no parameters'],
      [
        { records: [{}], parameters: { mapping: {}, uniqueIdentifiers: [] } },
        'no target form',
      ],
      [
        {
          records: [{}],
          parameters: { convertTo: FORM_ID, uniqueIdentifiers: [] },
        },
        'no mapping',
      ],
      [
        {
          records: [{}],
          parameters: { convertTo: FORM_ID, mapping: {} },
        },
        'no unique identifiers',
      ],
    ];
    it.each(malformed)('rejects malformed input %# (%s)', async (body) => {
      grant(['create']);
      const res = await request(buildApp(client))
        .post('/upload/resource/insert')
        .send(body);
      expect(res.status).toBe(400);
      expect(res.text).toBe('routes.upload.errors.invalidInsertParameters');
      expect(Form.findById).not.toHaveBeenCalled();
      expect(insertRecords).not.toHaveBeenCalled();
    });

    it('does nothing when the list of records is empty', async () => {
      grant([]);
      const res = await request(buildApp(client))
        .post('/upload/resource/insert')
        .send({ ...insertBody(), records: [] });
      expect(res.status).toBe(200);
      expect(res.text).toBe('routes.upload.errors.noRecordsToInsert');
      expect(insertRecords).not.toHaveBeenCalled();
    });
  });

  describe('POST /upload/form/records/:id (xlsx)', () => {
    it('refuses users without upload permission on the form, even when the resource lists no role', async () => {
      grant([]);
      const res = await request(buildApp(client))
        .post(`/upload/form/records/${FORM_ID}`)
        .attach('excelFile', await buildXlsx(), 'records.xlsx');
      expect(res.status).toBe(403);
      expect(res.text).toBe('common.errors.permissionNotGranted');
      expect(Record.insertMany).not.toHaveBeenCalled();
    });

    it('refuses users who may create records but not upload them', async () => {
      grant(['create']);
      const res = await request(buildApp(client))
        .post(`/upload/form/records/${FORM_ID}`)
        .attach('excelFile', await buildXlsx(), 'records.xlsx');
      expect(res.status).toBe(403);
      expect(res.text).toBe('common.errors.permissionNotGranted');
      expect(Record.insertMany).not.toHaveBeenCalled();
    });

    it('inserts the rows for users allowed to upload records of the form', async () => {
      grant(['upload']);
      (getUploadColumns as jest.Mock).mockReturnValue([{ name: 'title' }]);
      (loadRow as jest.Mock).mockReturnValue({
        data: { title: 'first record' },
        positionAttributes: [],
      });
      const res = await request(buildApp(client))
        .post(`/upload/form/records/${FORM_ID}`)
        .attach('excelFile', await buildXlsx(), 'records.xlsx');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'OK', warnings: [] });
      expect(Record.insertMany).toHaveBeenCalledTimes(1);
      expect((Record.insertMany as jest.Mock).mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('POST /upload/file/:form', () => {
    it('refuses users who can neither create nor update records of the form', async () => {
      grant(['read']);
      const res = await request(buildApp(client))
        .post(`/upload/file/${FORM_ID}`)
        .attach('file', Buffer.from('hello'), 'hello.txt');
      expect(res.status).toBe(403);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it.each([['create'], ['update']])(
      'stores the file for users who can %s records of the form',
      async (action) => {
        grant([action]);
        (uploadFile as jest.Mock).mockResolvedValue('forms/abc/hello.txt');
        const res = await request(buildApp(client))
          .post(`/upload/file/${FORM_ID}`)
          .attach('file', Buffer.from('hello'), 'hello.txt');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ path: 'forms/abc/hello.txt' });
        expect(uploadFile).toHaveBeenCalledWith(
          'forms',
          FORM_ID,
          expect.objectContaining({ name: 'hello.txt' })
        );
      }
    );
  });
});
