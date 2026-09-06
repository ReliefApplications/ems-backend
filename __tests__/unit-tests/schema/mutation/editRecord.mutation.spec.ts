import { Form, Record, Resource } from '@models';
import editRecord from '@schema/mutation/editRecord.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

jest.mock('@services/logger.service');

jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('editRecord Resolver — uniqueness rules', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let resource: Resource;
  let form: Form;
  let record: Record;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    context = {
      user: {
        _id: new Types.ObjectId(),
        name: 'Test User',
        username: 'test@user.com',
      },
      i18next: { t: jest.fn((key: string) => key) },
      timeZone: 'UTC',
    } as unknown as Context;

    (extendAbilityForRecords as jest.Mock).mockResolvedValue({
      can: jest.fn().mockReturnValue(true),
      cannot: jest.fn().mockReturnValue(false),
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
    await Record.create({
      incrementalId: '1',
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
    });
    record = await Record.create({
      incrementalId: '2',
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data: { org_code: 'XYZ' },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await Record.deleteMany({});
    await Resource.deleteMany({});
    await Form.deleteMany({});
  });

  it('throws a GraphQLError when the new value collides with another record (error severity)', async () => {
    const result = editRecord.resolve(
      null,
      { id: record.id, data: { org_code: 'ABC' }, skipValidation: false },
      context
    );
    await expect(result).rejects.toThrow(GraphQLError);
  });

  it('allows the update when the value is not a duplicate', async () => {
    const updated = await editRecord.resolve(
      null,
      { id: record.id, data: { org_code: 'NEW' }, skipValidation: false },
      context
    );
    expect((updated as any).data.org_code).toEqual('NEW');
  });

  it('allows re-saving the record with its own unchanged value', async () => {
    const updated = await editRecord.resolve(
      null,
      { id: record.id, data: { org_code: 'XYZ' }, skipValidation: false },
      context
    );
    expect((updated as any).data.org_code).toEqual('XYZ');
  });

  it('returns validationErrors without saving for a warning-severity duplicate', async () => {
    resource.uniquenessRules = [{ fields: ['org_code'], severity: 'warning' }];
    await resource.save();

    const updated: any = await editRecord.resolve(
      null,
      { id: record.id, data: { org_code: 'ABC' }, skipValidation: false },
      context
    );
    expect(updated.validationErrors).toHaveLength(1);
    const unchanged = await Record.findById(record.id);
    expect(unchanged.data.org_code).toEqual('XYZ');
  });

  it('saves the record when skipValidation is set despite a warning-severity duplicate', async () => {
    resource.uniquenessRules = [{ fields: ['org_code'], severity: 'warning' }];
    await resource.save();

    await editRecord.resolve(
      null,
      { id: record.id, data: { org_code: 'ABC' }, skipValidation: true },
      context
    );
    const updated = await Record.findById(record.id);
    expect(updated.data.org_code).toEqual('ABC');
  });
});
