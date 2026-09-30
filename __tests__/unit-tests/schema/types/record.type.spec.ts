import mongoose from 'mongoose';
import { Record, Resource } from '@models';
import { RecordType } from '@schema/types/record.type';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

jest.mock('@services/logger.service');

// Field-level permissions are driven by the mocked ability, per test
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

/**
 * Builds an ability whose `can` answers with the given function.
 *
 * @param can Ability check implementation
 * @returns Fake ability
 */
const buildAbility = (can: (...args: any[]) => boolean) => ({ can });

/**
 * Resolves the `data` field of the Record GraphQL type.
 *
 * @param record Record to resolve the data of
 * @param args Field arguments
 * @param context GraphQL context
 * @returns Resolved data
 */
const resolveData = (record: any, args: any, context: any) =>
  (RecordType.getFields().data.resolve as any)(record, args, context, {});

describe('Record type data resolver', () => {
  let databaseHelpers: DatabaseHelpers;
  let resource: any;
  let record: any;
  let context: any;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    resource = await new Resource({
      name: 'country',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'population', type: 'numeric' },
        {
          name: 'status',
          type: 'dropdown',
          choices: [
            { value: 'active', text: 'Active' },
            { value: 'inactive', text: 'Inactive' },
          ],
        },
        {
          name: 'is_big',
          type: 'boolean',
          isCalculated: true,
          expression: '{{calc.gte({{data.population}}; 1000)}}',
        },
        {
          name: 'population_x2',
          type: 'numeric',
          isCalculated: true,
          expression: '{{calc.mul({{data.population}}; 2)}}',
        },
      ],
    }).save();

    const formId = new mongoose.Types.ObjectId();
    record = await new Record({
      incrementalId: '2026-D0000001',
      form: formId,
      _form: { _id: formId, name: 'country' },
      resource: resource._id,
      data: { name: 'France', population: 2000, status: 'active' },
    }).save();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      user: { _id: new mongoose.Types.ObjectId(), attributes: {} },
      timeZone: 'UTC',
      i18next: { t: (key: string) => key },
    };
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(
      buildAbility(() => true)
    );
  });

  it('returns the stored data as is when calculated fields are not requested', async () => {
    const data = await resolveData(record, {}, context);

    expect(data).toEqual({
      name: 'France',
      population: 2000,
      status: 'active',
    });
    expect(extendAbilityForRecords).not.toHaveBeenCalled();
  });

  it('does not compute the calculated fields for display data unless requested', async () => {
    const data = await resolveData(record, { display: true }, context);

    expect(data).toEqual({
      name: 'France',
      population: 2000,
      // Choices are replaced by their display text
      status: 'Active',
      is_big: null,
      population_x2: null,
    });
    expect(extendAbilityForRecords).not.toHaveBeenCalled();
  });

  it('computes the calculated fields when requested, keeping raw values', async () => {
    const data = await resolveData(record, { calculatedFields: true }, context);

    expect(data).toEqual({
      name: 'France',
      population: 2000,
      status: 'active',
      is_big: true,
      population_x2: 4000,
    });
  });

  it('computes the calculated fields on display data when requested', async () => {
    const data = await resolveData(
      record,
      { display: true, calculatedFields: true },
      context
    );

    expect(data).toEqual({
      name: 'France',
      population: 2000,
      status: 'Active',
      is_big: true,
      population_x2: 4000,
    });
  });

  it('only computes the calculated fields the user can read', async () => {
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(
      buildAbility(
        (action: string, _subject: any, field: string) =>
          action === 'read' && field !== 'data.population_x2'
      )
    );

    const data = await resolveData(record, { calculatedFields: true }, context);

    expect(data.is_big).toBe(true);
    expect(data.population_x2).toBeUndefined();
  });

  it('still returns the record data when a calculated field cannot be computed', async () => {
    (extendAbilityForRecords as jest.Mock).mockRejectedValue(
      new Error('ability failure')
    );

    const data = await resolveData(record, { calculatedFields: true }, context);

    expect(data).toEqual({
      name: 'France',
      population: 2000,
      status: 'active',
    });
  });
});
