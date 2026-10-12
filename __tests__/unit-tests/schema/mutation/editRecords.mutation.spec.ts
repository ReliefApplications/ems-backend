import { Form, Record, Resource } from '@models';
import editRecords from '@schema/mutation/editRecords.mutation';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../../helpers/database-helpers';
import { GraphQLError } from 'graphql';
import { Context } from '@server/apollo/context';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { checkRecordValidation } from '@utils/form';
import { logger } from '@services/logger.service';

jest.mock('@services/logger.service');

// Mock the extendAbilityForRecords function
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the survey validation
jest.mock('@utils/form', () => ({
  ...jest.requireActual('@utils/form'),
  checkRecordValidation: jest.fn(),
}));

/** Record returned when validation fails */
type RecordWithValidationErrors = Record & { validationErrors: unknown[] };

describe('editRecords Resolver', () => {
  let context: Context;
  let databaseHelpers: DatabaseHelpers;
  let resource: Resource;
  let form: Form;
  let nextIdCounter = 0;

  /**
   * Creates a record of the test form.
   *
   * @param data Data of the record
   * @returns the created record
   */
  const createRecord = async (data: any) =>
    Record.create({
      incrementalId: `2026-B${String(++nextIdCounter).padStart(8, '0')}`,
      form: form._id,
      _form: { _id: form._id, name: form.name },
      resource: resource._id,
      data,
    });

  /**
   * Gets the stored value of a field, for a list of records.
   *
   * @param records Records to get the value of
   * @param field Name of the field
   * @returns values of the field, in the same order as the records
   */
  const storedValues = async (records: Record[], field: string) =>
    Promise.all(
      records.map(async (x) => (await Record.findById(x._id)).data[field])
    );

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
    (checkRecordValidation as jest.Mock).mockReturnValue([]);

    const fields = [
      { name: 'name', type: 'text' },
      { name: 'country', type: 'text' },
    ];
    resource = await Resource.create({
      name: `Organization-${new Types.ObjectId()}`,
      fields,
      uniquenessRules: [{ fields: ['name', 'country'], severity: 'error' }],
    });
    form = await Form.create({
      name: 'Organization form',
      graphQLTypeName: `Organization${new Types.ObjectId()}`,
      resource: resource._id,
      core: true,
      fields,
    });
  });

  afterEach(async () => {
    await Record.deleteMany({ resource: resource._id });
    await Form.deleteMany({ _id: form._id });
    await Resource.deleteMany({ _id: resource._id });
  });

  it('updates the records when no uniqueness rule is violated', async () => {
    const records = [
      await createRecord({ name: 'Red Cross', country: 'CH' }),
      await createRecord({ name: 'Red Crescent', country: 'CH' }),
    ];
    const updated = await editRecords.resolve(
      null,
      {
        ids: records.map((x) => x.id),
        data: { country: 'FR' },
        skipValidation: true,
      },
      context
    );
    expect(updated).toHaveLength(2);
    expect(await storedValues(records, 'country')).toEqual(['FR', 'FR']);
  });

  it('does not update any record when one duplicates another record (error severity)', async () => {
    await createRecord({ name: 'Red Cross', country: 'FR' });
    const records = [
      await createRecord({ name: 'Red Crescent', country: 'CH' }),
      await createRecord({ name: 'Red Cross', country: 'CH' }),
    ];
    const result = editRecords.resolve(
      null,
      {
        ids: records.map((x) => x.id),
        data: { country: 'FR' },
        skipValidation: true,
      },
      context
    );
    await expect(result).rejects.toThrow(GraphQLError);
    await expect(result).rejects.toThrow(records[1].incrementalId);
    // The request did not fail: it must not be logged as an error
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(await storedValues(records, 'country')).toEqual(['CH', 'CH']);
  });

  it('does not update any record when the edited records would duplicate each other', async () => {
    const records = [
      await createRecord({ name: 'Red Cross', country: 'CH' }),
      await createRecord({ name: 'Red Cross', country: 'BE' }),
    ];
    const result = editRecords.resolve(
      null,
      {
        ids: records.map((x) => x.id),
        data: { country: 'FR' },
        skipValidation: true,
      },
      context
    );
    await expect(result).rejects.toThrow(GraphQLError);
    expect(await storedValues(records, 'country')).toEqual(['CH', 'BE']);
  });

  it('does not compare the edited records with their own previous values', async () => {
    const records = [
      await createRecord({ name: 'Red Cross', country: 'CH' }),
      await createRecord({ name: 'Red Crescent', country: 'CH' }),
    ];
    // Same values as before: each record only matches itself
    await editRecords.resolve(
      null,
      {
        ids: records.map((x) => x.id),
        data: { country: 'CH' },
        skipValidation: true,
      },
      context
    );
    expect(await storedValues(records, 'country')).toEqual(['CH', 'CH']);
  });

  describe('Warning severity', () => {
    let records: Record[];

    beforeEach(async () => {
      resource.uniquenessRules = [
        { fields: ['name', 'country'], severity: 'warning' },
      ];
      await resource.save();
      await createRecord({ name: 'Red Cross', country: 'FR' });
      records = [
        await createRecord({ name: 'Red Crescent', country: 'CH' }),
        await createRecord({ name: 'Red Cross', country: 'CH' }),
      ];
    });

    it('returns validationErrors for the duplicates, and updates the other records', async () => {
      const updated = (await editRecords.resolve(
        null,
        {
          ids: records.map((x) => x.id),
          data: { country: 'FR' },
          skipValidation: false,
        },
        context
      )) as RecordWithValidationErrors[];
      const duplicate = updated.find((x) => x._id.equals(records[1]._id));
      expect(duplicate.validationErrors).toHaveLength(1);
      expect(await storedValues(records, 'country')).toEqual(['FR', 'CH']);
    });

    it('updates the duplicates when validation is skipped', async () => {
      await editRecords.resolve(
        null,
        {
          ids: records.map((x) => x.id),
          data: { country: 'FR' },
          skipValidation: true,
        },
        context
      );
      expect(await storedValues(records, 'country')).toEqual(['FR', 'FR']);
    });
  });
});
