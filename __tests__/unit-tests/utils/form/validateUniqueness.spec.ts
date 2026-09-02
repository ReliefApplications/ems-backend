import { Record, Resource } from '@models';
import { validateUniqueness } from '@utils/form';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

describe('validateUniqueness', () => {
  let databaseHelpers: DatabaseHelpers;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  afterEach(async () => {
    await Record.deleteMany({});
    await Resource.deleteMany({});
  });

  it('returns no violation when the resource has no uniqueness rules', async () => {
    const resource = await Resource.create({ name: 'Organization', fields: [] });
    const result = await validateUniqueness({ org_code: 'ABC' }, resource);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns no violation when the resource is null', async () => {
    const result = await validateUniqueness({ org_code: 'ABC' }, null);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports an error violation on a single duplicate field', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [
        { fields: ['org_code'], severity: 'error' },
      ],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
    });

    const result = await validateUniqueness({ org_code: 'ABC' }, resource);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it('does not flag a value that is not a duplicate', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
    });

    const result = await validateUniqueness({ org_code: 'XYZ' }, resource);
    expect(result.errors).toEqual([]);
  });

  it('only flags a duplicate when every field of a composite rule matches', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'name' }, { name: 'country' }],
      uniquenessRules: [
        { fields: ['name', 'country'], severity: 'error' },
      ],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { name: 'Red Cross', country: 'CH' },
    });

    // Same name, different country: not a duplicate
    expect(
      (await validateUniqueness({ name: 'Red Cross', country: 'FR' }, resource))
        .errors
    ).toEqual([]);

    // Same name and country: duplicate
    expect(
      (await validateUniqueness({ name: 'Red Cross', country: 'CH' }, resource))
        .errors
    ).toHaveLength(1);
  });

  it('reports a warning (non-blocking) violation for warning-severity rules', async () => {
    const resource = await Resource.create({
      name: 'Person',
      fields: [{ name: 'first_name' }, { name: 'last_name' }, { name: 'dob' }],
      uniquenessRules: [
        {
          fields: ['first_name', 'last_name', 'dob'],
          severity: 'warning',
          message: 'A person with the same identity already exists.',
        },
      ],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { first_name: 'John', last_name: 'Doe', dob: '1990-01-01' },
    });

    const result = await validateUniqueness(
      { first_name: 'John', last_name: 'Doe', dob: '1990-01-01' },
      resource
    );
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      {
        question: 'first_name + last_name + dob',
        errors: ['A person with the same identity already exists.'],
      },
    ]);
  });

  it('excludes the current record when editing', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    const record = await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
    });

    // Editing the same record with its own (unchanged) value should not conflict
    const result = await validateUniqueness(
      { org_code: 'ABC' },
      resource,
      record._id
    );
    expect(result.errors).toEqual([]);
  });

  it('skips a rule when one of its fields is missing from the data', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'name' }, { name: 'country' }],
      uniquenessRules: [{ fields: ['name', 'country'], severity: 'error' }],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { name: 'Red Cross', country: 'CH' },
    });

    const result = await validateUniqueness({ name: 'Red Cross' }, resource);
    expect(result.errors).toEqual([]);
  });

  it('ignores archived records when checking for duplicates', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
      archived: true,
    });

    const result = await validateUniqueness({ org_code: 'ABC' }, resource);
    expect(result.errors).toEqual([]);
  });

  describe('conditional uniqueness', () => {
    it('only enforces the rule when the condition is met (case_status open example)', async () => {
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
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { person: 'john-doe', case_status: 'Open' },
      });

      // A new open case for the same person is blocked
      expect(
        (
          await validateUniqueness(
            { person: 'john-doe', case_status: 'Open' },
            resource
          )
        ).errors
      ).toHaveLength(1);

      // A closed case for the same person does not violate the rule itself...
      expect(
        (
          await validateUniqueness(
            { person: 'john-doe', case_status: 'Closed' },
            resource
          )
        ).errors
      ).toEqual([]);
    });

    it('does not match against records outside the condition (country/primary/active example)', async () => {
      const resource = await Resource.create({
        name: 'Assignment',
        fields: [
          { name: 'country' },
          { name: 'scope' },
          { name: 'isPrimary' },
          { name: 'isActive' },
        ],
        uniquenessRules: [
          {
            fields: ['country'],
            severity: 'error',
            condition: [
              { field: 'scope', operator: 'eq', value: 'Country' },
              { field: 'isPrimary', operator: 'eq', value: true },
              { field: 'isActive', operator: 'eq', value: true },
            ],
          },
        ],
      });
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          country: 'CH',
          scope: 'Country',
          isPrimary: true,
          isActive: false, // inactive: does not count
        },
      });

      const result = await validateUniqueness(
        {
          country: 'CH',
          scope: 'Country',
          isPrimary: true,
          isActive: true,
        },
        resource
      );
      expect(result.errors).toEqual([]);
    });
  });

  describe('date-intersection uniqueness', () => {
    const buildResource = (severity: 'error' | 'warning' = 'error') =>
      Resource.create({
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
            severity,
            dateIntersection: {
              startField: 'start_date',
              endField: 'end_date',
            },
          },
        ],
      });

    it('flags overlapping periods for the same expert and country', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-03-01',
        },
      });

      const result = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-02-01',
          end_date: '2026-04-01',
        },
        resource
      );
      expect(result.errors).toHaveLength(1);
    });

    it('does not flag non-overlapping periods', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-02-01',
        },
      });

      const result = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-03-01',
          end_date: '2026-04-01',
        },
        resource
      );
      expect(result.errors).toEqual([]);
    });

    it('does not flag overlapping periods for a different expert or country', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-03-01',
        },
      });

      expect(
        (
          await validateUniqueness(
            {
              expert: 'bob',
              country: 'CH',
              start_date: '2026-02-01',
              end_date: '2026-04-01',
            },
            resource
          )
        ).errors
      ).toEqual([]);
    });

    it('treats touching boundaries as overlapping by default', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-02-01',
        },
      });

      const result = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-02-01',
          end_date: '2026-03-01',
        },
        resource
      );
      expect(result.errors).toHaveLength(1);
    });

    it('reports a warning instead of an error when the rule severity is warning', async () => {
      const resource = await buildResource('warning');
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-01-01',
          end_date: '2026-03-01',
        },
      });

      const result = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-02-01',
          end_date: '2026-04-01',
        },
        resource
      );
      expect(result.errors).toEqual([]);
      expect(result.warnings).toHaveLength(1);
    });
  });
});
