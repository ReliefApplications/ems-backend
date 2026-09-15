import { Workbook } from 'exceljs';
import { Form, Record, Resource } from '@models';
import { insertRecords } from '@routes/upload';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { getNextId } from '@utils/form';

// Mock getNextId only, as it relies on Redis
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
  getNextId: jest.fn(),
}));

/**
 * Builds an in-memory xlsx file buffer with the given header row and data rows.
 *
 * @param headers column headers, matching resource/form field names
 * @param rows data rows, in the same order as headers
 * @returns the xlsx file as a buffer
 */
const buildWorkbookBuffer = async (
  headers: string[],
  rows: any[][]
): Promise<Buffer> => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
};

/** Builds a fake Express response object that records status()/send() calls */
const fakeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('insertRecords (bulk upload uniqueness enforcement)', () => {
  let databaseHelpers: DatabaseHelpers;
  let resource: Resource;
  let form: Form;
  let context: any;
  const t = jest.fn((key: string) => key);

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    let nextIdCounter = 0;
    (getNextId as jest.Mock).mockImplementation(async () => {
      nextIdCounter += 1;
      return `2026-P${String(nextIdCounter).padStart(8, '0')}`;
    });

    resource = await Resource.create({
      name: `Organization-${new Types.ObjectId()}`,
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    form = await Form.create({
      name: 'Organization form',
      graphQLTypeName: `Organization${new Types.ObjectId()}`,
      resource: resource._id,
      core: true,
      fields: [{ name: 'org_code' }],
    });
    context = {
      user: {
        _id: new Types.ObjectId(),
        name: 'Test User',
        username: 'test@user.com',
        roles: [{ _id: new Types.ObjectId() }],
        ability: { can: jest.fn().mockReturnValue(true) },
      },
    };
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await Record.deleteMany({});
    await Resource.deleteMany({});
    await Form.deleteMany({});
  });

  it('rejects the whole file when a row duplicates another row in the same file', async () => {
    const file = {
      data: await buildWorkbookBuffer(
        ['org_code'],
        [['ABC'], ['XYZ'], ['ABC']]
      ),
    };
    const res = fakeRes();

    await insertRecords(res, file, form, form.fields, context, resource, t);

    expect(res.status).toHaveBeenCalledWith(400);
    const count = await Record.countDocuments({ resource: resource._id });
    expect(count).toEqual(0);
  });

  it('rejects the whole file when a row duplicates an already-existing record', async () => {
    await Record.create({
      incrementalId: '1',
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
    });
    const file = {
      data: await buildWorkbookBuffer(['org_code'], [['NEW'], ['ABC']]),
    };
    const res = fakeRes();

    await insertRecords(res, file, form, form.fields, context, resource, t);

    expect(res.status).toHaveBeenCalledWith(400);
    // only the pre-existing record, nothing from the file was inserted
    const count = await Record.countDocuments({ resource: resource._id });
    expect(count).toEqual(1);
  });

  it('inserts every row when none violate a rule', async () => {
    const file = {
      data: await buildWorkbookBuffer(['org_code'], [['ABC'], ['XYZ']]),
    };
    const res = fakeRes();

    await insertRecords(res, file, form, form.fields, context, resource, t);

    expect(res.status).toHaveBeenCalledWith(200);
    const count = await Record.countDocuments({ resource: resource._id });
    expect(count).toEqual(2);
  });

  it('inserts rows and reports warnings for warning-severity rules', async () => {
    resource.uniquenessRules = [
      { fields: ['org_code'], severity: 'warning' },
    ];
    await resource.save();
    const file = {
      data: await buildWorkbookBuffer(['org_code'], [['ABC'], ['ABC']]),
    };
    const res = fakeRes();

    await insertRecords(res, file, form, form.fields, context, resource, t);

    expect(res.status).toHaveBeenCalledWith(200);
    const sendArg = res.send.mock.calls[0][0];
    expect(sendArg.warnings).toHaveLength(1);
    const count = await Record.countDocuments({ resource: resource._id });
    expect(count).toEqual(2);
  });

  it('inserts every row when the resource has no uniqueness rules', async () => {
    resource.uniquenessRules = [];
    await resource.save();
    const file = {
      data: await buildWorkbookBuffer(['org_code'], [['ABC'], ['ABC']]),
    };
    const res = fakeRes();

    await insertRecords(res, file, form, form.fields, context, resource, t);

    expect(res.status).toHaveBeenCalledWith(200);
    const count = await Record.countDocuments({ resource: resource._id });
    expect(count).toEqual(2);
  });
});
