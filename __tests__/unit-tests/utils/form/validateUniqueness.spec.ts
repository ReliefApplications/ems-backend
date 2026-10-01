import { Record, Resource } from '@models';
import {
  getConditionFilter,
  getUnknownRuleField,
  validateUniqueness,
} from '@utils/form';
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
        severity: 'warning',
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

  it('ignores draft records when checking for duplicates', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    await Record.create({
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { org_code: 'ABC' },
      draft: true,
    });

    const result = await validateUniqueness({ org_code: 'ABC' }, resource);
    expect(result.errors).toEqual([]);
  });

  it('compares texts regardless of case and extra whitespaces', async () => {
    const resource = await Resource.create({
      name: 'Person',
      fields: [{ name: 'first_name' }, { name: 'last_name' }],
      uniquenessRules: [
        { fields: ['first_name', 'last_name'], severity: 'warning' },
      ],
    });
    await Record.create({
      incrementalId: '1',
      form: resource._id,
      _form: { _id: resource._id, name: resource.name },
      resource: resource._id,
      data: { first_name: 'John', last_name: 'Van  Damme ' },
    });

    const duplicate = await validateUniqueness(
      { first_name: ' john', last_name: 'van damme' },
      resource
    );
    expect(duplicate.warnings).toHaveLength(1);

    // A text only containing the other one is not a duplicate
    const different = await validateUniqueness(
      { first_name: 'Johnny', last_name: 'van damme' },
      resource
    );
    expect(different.warnings).toEqual([]);
  });

  it('does not interpret special characters of a text', async () => {
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

    const wildcard = await validateUniqueness({ org_code: 'A.C' }, resource);
    expect(wildcard.errors).toEqual([]);
  });

  it('skips a rule when one of its fields only contains whitespaces', async () => {
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
      data: { org_code: '  ' },
    });

    const result = await validateUniqueness({ org_code: ' ' }, resource);
    expect(result.errors).toEqual([]);
  });

  it('excludes several records when a list of ids is given', async () => {
    const resource = await Resource.create({
      name: 'Organization',
      fields: [{ name: 'org_code' }],
      uniquenessRules: [{ fields: ['org_code'], severity: 'error' }],
    });
    const records = await Record.create(
      ['1', '2'].map((incrementalId) => ({
        incrementalId,
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { org_code: 'ABC' },
      }))
    );

    const excluded = await validateUniqueness(
      { org_code: 'ABC' },
      resource,
      records.map((x) => x._id)
    );
    expect(excluded.errors).toEqual([]);

    const partlyExcluded = await validateUniqueness(
      { org_code: 'ABC' },
      resource,
      [records[0]._id]
    );
    expect(partlyExcluded.errors).toHaveLength(1);
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

    describe('filter in the format of layouts', () => {
      /**
       * Creates a resource of cases, unique by person among the cases
       * matching the filter, and a first case.
       *
       * @param condition Filter of the rule
       * @param status Status of the existing case
       * @returns the created resource
       */
      const buildCases = async (condition: any, status: string) => {
        const resource = await Resource.create({
          name: 'Case',
          fields: [
            { name: 'person', type: 'text' },
            { name: 'case_status', type: 'dropdown' },
            { name: 'urgent', type: 'boolean' },
            { name: 'comment', type: 'text' },
          ],
          uniquenessRules: [{ fields: ['person'], severity: 'error', condition }],
        });
        await Record.create({
          incrementalId: '1',
          form: resource._id,
          _form: { _id: resource._id, name: resource.name },
          resource: resource._id,
          data: {
            person: 'john-doe',
            case_status: status,
            urgent: true,
            comment: 'Waiting for transport',
          },
        });
        return resource;
      };

      /**
       * Counts the blocking violations of a new case of the same person.
       *
       * @param resource Resource of the cases
       * @param data Data of the new case, except the person
       * @returns number of violated rules
       */
      const countErrors = async (resource: Resource, data: any) =>
        (await validateUniqueness({ person: 'john-doe', ...data }, resource))
          .errors.length;

      it('supports the "is not equal to" operator', async () => {
        const resource = await buildCases(
          {
            logic: 'and',
            filters: [
              { field: 'case_status', operator: 'neq', value: 'Closed' },
            ],
          },
          'Open'
        );
        expect(await countErrors(resource, { case_status: 'Open' })).toBe(1);
        expect(await countErrors(resource, { case_status: 'Pending' })).toBe(1);
        // No status yet: the case is not closed
        expect(await countErrors(resource, {})).toBe(1);
        expect(await countErrors(resource, { case_status: 'Closed' })).toBe(0);
      });

      it('does not compare with the records which do not match the filter', async () => {
        const resource = await buildCases(
          {
            logic: 'and',
            filters: [
              { field: 'case_status', operator: 'neq', value: 'Closed' },
            ],
          },
          'Closed'
        );
        expect(await countErrors(resource, { case_status: 'Open' })).toBe(0);
      });

      it('supports conditions of which only one is required', async () => {
        const resource = await buildCases(
          {
            logic: 'or',
            filters: [
              { field: 'case_status', operator: 'eq', value: 'Open' },
              { field: 'case_status', operator: 'eq', value: 'Pending' },
            ],
          },
          'Open'
        );
        expect(await countErrors(resource, { case_status: 'Pending' })).toBe(1);
        expect(await countErrors(resource, { case_status: 'Closed' })).toBe(0);
      });

      it('supports groups of conditions, booleans and texts', async () => {
        const resource = await buildCases(
          {
            logic: 'and',
            filters: [
              { field: 'urgent', operator: 'eq', value: true },
              {
                logic: 'or',
                filters: [
                  { field: 'comment', operator: 'contains', value: 'transport' },
                  { field: 'case_status', operator: 'eq', value: 'Pending' },
                ],
              },
            ],
          },
          'Open'
        );
        expect(
          await countErrors(resource, {
            urgent: true,
            comment: 'Transport booked',
          })
        ).toBe(1);
        expect(
          await countErrors(resource, { urgent: true, case_status: 'Pending' })
        ).toBe(1);
        expect(
          await countErrors(resource, { urgent: true, comment: 'Nothing yet' })
        ).toBe(0);
        expect(
          await countErrors(resource, {
            urgent: false,
            comment: 'Transport booked',
          })
        ).toBe(0);
      });

      it('applies the rule to all records when the filter is empty', async () => {
        const resource = await buildCases({ logic: 'and', filters: [] }, 'Open');
        expect(await countErrors(resource, { case_status: 'Closed' })).toBe(1);
      });
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

    it('treats a missing end date as an ongoing period', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { expert: 'alice', country: 'CH', start_date: '2026-01-01' },
      });

      // Starts while the existing, ongoing, period is running
      const overlapping = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2027-06-01',
          end_date: '2027-07-01',
        },
        resource
      );
      expect(overlapping.errors).toHaveLength(1);

      // Ends before the existing period starts
      const earlier = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2025-01-01',
          end_date: '2025-12-01',
        },
        resource
      );
      expect(earlier.errors).toEqual([]);

      // A new ongoing period overlaps the existing one
      const ongoing = await validateUniqueness(
        { expert: 'alice', country: 'CH', start_date: '2028-01-01' },
        resource
      );
      expect(ongoing.errors).toHaveLength(1);
    });

    it('treats a missing start date as a period without beginning', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { expert: 'alice', country: 'CH', end_date: '2026-03-01' },
      });

      const overlapping = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2025-01-01',
          end_date: '2025-02-01',
        },
        resource
      );
      expect(overlapping.errors).toHaveLength(1);

      const later = await validateUniqueness(
        {
          expert: 'alice',
          country: 'CH',
          start_date: '2026-04-01',
          end_date: '2026-05-01',
        },
        resource
      );
      expect(later.errors).toEqual([]);
    });

    it('skips the rule when both dates are missing, or one is invalid', async () => {
      const resource = await buildResource();
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { expert: 'alice', country: 'CH', start_date: '2026-01-01' },
      });

      const withoutDates = await validateUniqueness(
        { expert: 'alice', country: 'CH' },
        resource
      );
      expect(withoutDates.errors).toEqual([]);

      const invalidDate = await validateUniqueness(
        { expert: 'alice', country: 'CH', start_date: 'not a date' },
        resource
      );
      expect(invalidDate.errors).toEqual([]);
    });

    it('uses the same default message as the other rules', async () => {
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
      expect(result.errors[0].errors).toEqual([
        'A record with the same expert, country already exists.',
      ]);
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

  describe('active toggle', () => {
    it('skips an inactive rule entirely', async () => {
      const resource = await Resource.create({
        name: 'Organization',
        fields: [{ name: 'org_code' }],
        uniquenessRules: [
          { fields: ['org_code'], severity: 'error', active: false },
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
      expect(result.errors).toEqual([]);
    });

    it('treats a rule as active when the flag is unset', async () => {
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

      const result = await validateUniqueness({ org_code: 'ABC' }, resource);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getConditionFilter', () => {
    it('returns the filter of the rule', () => {
      const filter = {
        logic: 'or',
        filters: [{ field: 'status', operator: 'eq', value: 'Open' }],
      };
      expect(getConditionFilter(filter)).toEqual(filter);
    });

    it('converts the conditions first stored as a list of equalities', () => {
      expect(
        getConditionFilter([
          { field: 'status', operator: 'ne', value: 'Closed' },
          { field: 'active', operator: 'eq', value: true },
        ])
      ).toEqual({
        logic: 'and',
        filters: [
          { field: 'status', operator: 'neq', value: 'Closed' },
          { field: 'active', operator: 'eq', value: true },
        ],
      });
    });

    it('returns null when there is no condition', () => {
      expect(getConditionFilter(undefined)).toBeNull();
      expect(getConditionFilter(null)).toBeNull();
      expect(getConditionFilter([])).toBeNull();
      expect(getConditionFilter({ logic: 'and', filters: [] })).toBeNull();
    });
  });

  describe('getUnknownRuleField', () => {
    const resource = {
      fields: [{ name: 'person' }, { name: 'status' }, { name: 'start' }],
    } as unknown as Resource;

    it('accepts rules only using fields of the resource', () => {
      expect(
        getUnknownRuleField(
          {
            fields: ['person'],
            condition: {
              logic: 'and',
              filters: [
                { field: 'status', operator: 'neq', value: 'Closed' },
                {
                  logic: 'or',
                  filters: [{ field: 'start', operator: 'isnotnull' }],
                },
              ],
            },
            dateIntersection: { startField: 'start', endField: 'start' },
          },
          resource
        )
      ).toBeUndefined();
    });

    it('finds the unknown fields of a filter, including in its groups', () => {
      expect(
        getUnknownRuleField(
          {
            fields: ['person'],
            condition: {
              logic: 'and',
              filters: [
                { field: 'status', operator: 'neq', value: 'Closed' },
                {
                  logic: 'or',
                  filters: [{ field: 'unknown', operator: 'eq', value: 1 }],
                },
              ],
            },
          },
          resource
        )
      ).toEqual('unknown');
    });

    it('finds the unknown unique fields and date range fields', () => {
      expect(getUnknownRuleField({ fields: ['other'] }, resource)).toEqual(
        'other'
      );
      expect(
        getUnknownRuleField(
          {
            fields: ['person'],
            dateIntersection: { startField: 'start', endField: 'end' },
          },
          resource
        )
      ).toEqual('end');
    });
  });

  describe('translated custom message', () => {
    let resourceCounter = 0;

    /**
     * Creates a resource with a rule whose message is translated, and a record
     * violating it.
     *
     * @param rule Options of the rule
     * @returns the created resource
     */
    const buildResource = async (rule: any) => {
      const resource = await Resource.create({
        // Resource names are unique
        name: `Organization ${++resourceCounter}`,
        fields: [{ name: 'org_code' }],
        uniquenessRules: [{ fields: ['org_code'], severity: 'error', ...rule }],
      });
      await Record.create({
        incrementalId: '1',
        form: resource._id,
        _form: { _id: resource._id, name: resource.name },
        resource: resource._id,
        data: { org_code: 'ABC' },
      });
      return resource;
    };

    /**
     * Gets the message of the violation, for a user of the given locale.
     *
     * @param resource Resource to check the rules of
     * @param locale Locale of the user
     * @returns message displayed to the user
     */
    const getMessage = async (resource: Resource, locale?: string) => {
      const result = await validateUniqueness(
        { org_code: 'ABC' },
        resource,
        undefined,
        undefined,
        { locale }
      );
      return result.errors[0].errors[0];
    };

    it('uses the translation of the message in the language of the user', async () => {
      const resource = await buildResource({
        message: 'Code already used',
        messageTranslations: {
          en: 'Code already used',
          fr: 'Code déjà utilisé',
        },
      });
      expect(await getMessage(resource, 'fr')).toEqual('Code déjà utilisé');
      expect(await getMessage(resource, 'en')).toEqual('Code already used');
    });

    it('falls back to another translation when the language of the user has none', async () => {
      const resource = await buildResource({
        message: 'Code déjà utilisé',
        messageTranslations: { en: 'Code already used', fr: 'Code déjà utilisé' },
      });
      expect(await getMessage(resource, 'uk')).toEqual('Code already used');
      expect(await getMessage(resource)).toEqual('Code already used');
    });

    it('uses the message when it has no translation', async () => {
      const resource = await buildResource({ message: 'Code already used' });
      expect(await getMessage(resource, 'fr')).toEqual('Code already used');
      const emptyTranslations = await buildResource({
        message: 'Code already used',
        messageTranslations: {},
      });
      expect(await getMessage(emptyTranslations, 'fr')).toEqual(
        'Code already used'
      );
    });

    it('displays the message as it is, without replacing anything in it', async () => {
      const resource = await buildResource({
        message: 'Duplicate {fields} in {scope} ({matchCount})',
      });
      expect(await getMessage(resource, 'en')).toEqual(
        'Duplicate {fields} in {scope} ({matchCount})'
      );
    });

    it('uses the default message when the rule has no message at all', async () => {
      const resource = await buildResource({});
      expect(await getMessage(resource, 'fr')).toEqual(
        'A record with the same org_code already exists.'
      );
    });
  });
});
