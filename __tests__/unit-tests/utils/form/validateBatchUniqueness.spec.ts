import { Resource } from '@models';
import { validateBatchUniqueness } from '@utils/form';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

describe('validateBatchUniqueness', () => {
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  afterEach(async () => {
    await Resource.deleteMany({});
  });

  it('returns empty results when the resource has no uniqueness rules', () => {
    const results = validateBatchUniqueness(
      [{ org_code: 'ABC' }, { org_code: 'ABC' }],
      null
    );
    expect(results).toEqual([
      { errors: [], warnings: [] },
      { errors: [], warnings: [] },
    ]);
  });

  it('flags every row after the first with the same value', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    const results = validateBatchUniqueness(
      [{ org_code: 'ABC' }, { org_code: 'XYZ' }, { org_code: 'ABC' }],
      resource
    );
    expect(results[0].errors).toEqual([]);
    expect(results[1].errors).toEqual([]);
    expect(results[2].errors).toHaveLength(1);
  });

  it('does not flag rows with different composite field values', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'name' }, { name: 'country' }],
      uniquenessRules: [{ fields: ['name', 'country'], severity: 'error' }],
    });
    const results = validateBatchUniqueness(
      [
        { name: 'Red Cross', country: 'CH' },
        { name: 'Red Cross', country: 'FR' },
      ],
      resource
    );
    expect(results[0].errors).toEqual([]);
    expect(results[1].errors).toEqual([]);
  });

  it('respects rule severity, reporting warnings separately from errors', async () => {
    const resource = await Resource.create({
      name: 'Person',
      fields: [{ name: 'first_name' }, { name: 'last_name' }],
      uniquenessRules: [
        { fields: ['first_name', 'last_name'], severity: 'warning' },
      ],
    });
    const results = validateBatchUniqueness(
      [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'John', last_name: 'Doe' },
      ],
      resource
    );
    expect(results[1].errors).toEqual([]);
    expect(results[1].warnings).toHaveLength(1);
  });

  it('only flags rows matching the rule condition', async () => {
    const resource = await Resource.create({
      name: 'Case',
      fields: [{ name: 'person' }, { name: 'case_status' }],
      uniquenessRules: [
        {
          fields: ['person'],
          severity: 'error',
          condition: [
            { field: 'case_status', operator: 'ne', value: 'Closed' },
          ],
        },
      ],
    });
    const results = validateBatchUniqueness(
      [
        { person: 'john-doe', case_status: 'Open' },
        { person: 'john-doe', case_status: 'Closed' },
        { person: 'john-doe', case_status: 'Open' },
      ],
      resource
    );
    expect(results[0].errors).toEqual([]);
    expect(results[1].errors).toEqual([]); // closed: condition not met
    expect(results[2].errors).toHaveLength(1); // second open case for same person
  });

  it('flags overlapping date ranges sharing the same scope fields', async () => {
    const resource = await Resource.create({
      name: 'Assignment',
      fields: [
        { name: 'expert' },
        { name: 'country' },
        { name: 'start_date' },
        { name: 'end_date' },
      ],
      uniquenessRules: [
        {
          fields: ['expert', 'country'],
          severity: 'error',
          dateIntersection: { startField: 'start_date', endField: 'end_date' },
        },
      ],
    });
    const results = validateBatchUniqueness(
      [
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-03-01',
        },
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-02-01',
          end_date: '2026-04-01',
        },
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-05-01',
          end_date: '2026-06-01',
        },
      ],
      resource
    );
    expect(results[0].errors).toEqual([]);
    expect(results[1].errors).toHaveLength(1); // overlaps row 0
    expect(results[2].errors).toEqual([]); // no overlap with earlier rows
  });
});
