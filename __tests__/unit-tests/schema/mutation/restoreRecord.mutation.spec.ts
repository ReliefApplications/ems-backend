import { Form, Record, Resource } from '@models';
import restoreRecord from '@schema/mutation/restoreRecord.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('restoreRecord Resolver', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let resource: Resource;
  let form: Form;
  let archived: Record;
  let nextIdCounter = 0;

  /**
   * Creates a record of the test form.
   *
   * @param orgCode Value of the unique field
   * @param isArchived Whether the record is archived
   * @returns the created record
   */
  const createRecord = async (orgCode: string, isArchived = false) =>
    Record.create({
      incrementalId: `2026-A${String(++nextIdCounter).padStart(8, '0')}`,
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data: { org_code: orgCode },
      archived: isArchived,
    });

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    context = {
      user: {
        _id: new Types.ObjectId(),
        name: 'Test User',
        username: 'test@user.com',
        roles: [],
        positionAttributes: [],
        ability: { can: jest.fn().mockReturnValue(true) },
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
    archived = await createRecord('ABC', true);
  });

  afterEach(async () => {
    await Record.deleteMany({ resource: resource._id });
    await Form.deleteMany({ _id: form._id });
    await Resource.deleteMany({ _id: resource._id });
  });

  it('restores an archived record', async () => {
    const restored = await restoreRecord.resolve(
      null,
      { id: archived.id },
      context
    );
    expect(restored.archived).toBe(false);
  });

  it('does not restore a record duplicating another one (error severity)', async () => {
    await createRecord('abc');
    const result = restoreRecord.resolve(null, { id: archived.id }, context);
    await expect(result).rejects.toThrow(GraphQLError);
    // The request did not fail: it must not be logged as an error
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const stored = await Record.findById(archived._id);
    expect(stored.archived).toBe(true);
  });

  it('restores a record duplicating another one for a warning-severity rule', async () => {
    resource.uniquenessRules = [{ fields: ['org_code'], severity: 'warning' }];
    await resource.save();
    await createRecord('ABC');
    const restored = await restoreRecord.resolve(
      null,
      { id: archived.id },
      context
    );
    expect(restored.archived).toBe(false);
  });
});
