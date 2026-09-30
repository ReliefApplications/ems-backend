import mongoose from 'mongoose';
import { Record, Resource } from '@models';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { DatabaseHelpers } from '../../helpers/database-helpers';

let databaseHelpers: DatabaseHelpers;

/** Counter to build unique incremental ids for seeded records */
let seq = 0;

/**
 * Seeds a record of the given resource.
 *
 * @param resource Resource the record belongs to
 * @param data Record data
 * @returns The saved record
 */
const seedRecord = async (resource: any, data: any) => {
  const formId = new mongoose.Types.ObjectId();
  return new Record({
    incrementalId: `2026-C${String(++seq).padStart(7, '0')}`,
    form: formId,
    _form: { _id: formId, name: resource.name },
    resource: resource._id,
    data,
    archived: false,
  }).save();
};

/**
 * Runs the compiled calc.translate stage over the records of a resource.
 *
 * @param resource Resource whose records are aggregated
 * @param locale Request locale to build the service with
 * @param expression Calculated-field expression
 * @param keyField Data field used to index the results
 * @returns Map of `keyField` value → computed `data.result` value
 */
const computeTranslated = async (
  resource: any,
  locale: string | undefined,
  expression: string,
  keyField: string
): Promise<globalThis.Record<string, any>> => {
  const service = new CalculatedFieldService(
    resource,
    locale ? ({ locale } as any) : null,
    'UTC'
  );
  const stages = await service.build(expression, 'result');
  const results = await Record.aggregate([
    { $match: { resource: resource._id } },
    ...(stages as any[]),
  ]);
  return Object.fromEntries(
    results.map((r: any) => [r.data[keyField], r.data.result])
  );
};

describe('calc.translate against a real database', () => {
  let resource: any;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    resource = await new Resource({
      name: 'tasks',
      fields: [
        { name: 'title', type: 'text' },
        {
          name: 'title_fr',
          type: 'text',
          translateField: 'title',
          translateTo: 'fr',
        },
        { name: 'code', type: 'text' },
      ],
    }).save();

    await seedRecord(resource, {
      title: 'hello',
      title_fr: 'Bonjour',
      code: 'A1',
    });
    await seedRecord(resource, {
      // French sibling explicitly left blank by the user
      title: 'goodbye',
      title_fr: '',
      code: 'A2',
    });
    await seedRecord(resource, {
      // No French sibling filled in at all
      title: 'welcome',
      code: 'A3',
    });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('resolves the translated value when the request locale matches and has a value', async () => {
    const results = await computeTranslated(
      resource,
      'fr',
      "{{calc.translate('title')}}",
      'code'
    );
    expect(results.A1).toBe('Bonjour');
  });

  it('falls back to the source value when the associated field is an empty string', async () => {
    const results = await computeTranslated(
      resource,
      'fr',
      "{{calc.translate('title')}}",
      'code'
    );
    expect(results.A2).toBe('goodbye');
  });

  it('falls back to the source value when the associated field was never filled in', async () => {
    const results = await computeTranslated(
      resource,
      'fr',
      "{{calc.translate('title')}}",
      'code'
    );
    expect(results.A3).toBe('welcome');
  });

  it('falls back to the source value in English (no sibling for that locale)', async () => {
    const results = await computeTranslated(
      resource,
      'en',
      "{{calc.translate('title')}}",
      'code'
    );
    expect(results.A1).toBe('hello');
    expect(results.A2).toBe('goodbye');
    expect(results.A3).toBe('welcome');
  });

  it('uses an explicit locale argument regardless of the request locale', async () => {
    const results = await computeTranslated(
      resource,
      'en',
      "{{calc.translate('title'; 'fr')}}",
      'code'
    );
    expect(results.A1).toBe('Bonjour');
  });
});
