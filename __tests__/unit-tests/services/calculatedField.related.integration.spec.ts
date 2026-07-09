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
 * @param archived Whether the record is archived
 * @returns The saved record
 */
const seedRecord = async (resource: any, data: any, archived = false) => {
  const formId = new mongoose.Types.ObjectId();
  return new Record({
    incrementalId: `2026-D${String(++seq).padStart(7, '0')}`,
    form: formId,
    _form: { _id: formId, name: resource.name },
    resource: resource._id,
    data,
    archived,
  }).save();
};

/**
 * Runs the compiled calculated-field stages over the records of a resource
 * and returns the computed values indexed by a data field.
 *
 * @param resource Resource whose records are aggregated
 * @param expression Calculated-field expression
 * @param name Calculated field name
 * @param keyField Data field used to index the results
 * @returns Map of `keyField` value → computed `data.<name>` value
 */
const compute = async (
  resource: any,
  expression: string,
  name: string,
  keyField: string
): Promise<globalThis.Record<string, any>> => {
  const service = new CalculatedFieldService(resource, null, 'UTC');
  const stages = await service.build(expression, name);
  const results = await Record.aggregate([
    { $match: { resource: resource._id } },
    ...(stages as any[]),
  ]);
  return Object.fromEntries(
    results.map((r: any) => [r.data[keyField], r.data[name]])
  );
};

describe('calc.related* against a real database', () => {
  let organization: any;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    organization = await new Resource({
      name: 'organization',
      fields: [{ name: 'name', type: 'text' }],
    }).save();
    const team = await new Resource({
      name: 'team',
      fields: [
        {
          name: 'organization',
          type: 'resource',
          resource: String(organization._id),
          relatedName: 'teams',
        },
        { name: 'label', type: 'text' },
        { name: 'active', type: 'boolean' },
        { name: 'grade', type: 'numeric' },
        { name: 'graded_on', type: 'date' },
      ],
    }).save();
    // A resource linking to organizations through a multi-select (array) field
    const expert = await new Resource({
      name: 'expert',
      fields: [
        {
          name: 'organizations',
          type: 'resources',
          resource: String(organization._id),
          relatedName: 'experts',
        },
      ],
    }).save();

    const [org1, org2] = await Promise.all([
      seedRecord(organization, { name: 'org1' }),
      seedRecord(organization, { name: 'org2' }),
    ]);
    await seedRecord(organization, { name: 'org3' });

    // org1: three teams (one inactive), grades over time + one archived team
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't1',
      active: true,
      grade: 3,
      graded_on: new Date('2026-01-01'),
    });
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't2',
      active: true,
      grade: 1,
      graded_on: new Date('2026-03-01'),
    });
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't3',
      active: false,
      grade: 2,
      graded_on: new Date('2026-02-01'),
    });
    await seedRecord(
      team,
      {
        organization: String(org1._id),
        label: 'archived',
        active: true,
        grade: 5,
        graded_on: new Date('2026-04-01'),
      },
      true
    );
    // org2: one team
    await seedRecord(team, {
      organization: String(org2._id),
      label: 't4',
      active: true,
      grade: 2,
      graded_on: new Date('2026-01-15'),
    });

    // experts linked to organizations through an array field
    await seedRecord(expert, {
      organizations: [String(org1._id), String(org2._id)],
    });
    await seedRecord(expert, { organizations: [String(org1._id)] });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('relatedCount counts linked records, ignoring archived ones', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedCount('teams')}}",
        'team_count',
        'name'
      )
    ).toEqual({ org1: 3, org2: 1, org3: 0 });
  });

  it('relatedCount applies the optional filter', async () => {
    expect(
      await compute(
        organization,
        '{{calc.relatedCount(\'teams\'; \'{"field":"active","operator":"eq","value":true}\')}}',
        'active_teams',
        'name'
      )
    ).toEqual({ org1: 2, org2: 1, org3: 0 });
  });

  it('relatedValue picks the value of the latest record by sort field', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'desc')}}",
        'latest_grade',
        'name'
      )
    ).toEqual({ org1: 1, org2: 2, org3: null });
  });

  it('relatedValue picks the earliest record when sorting asc', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'asc')}}",
        'initial_grade',
        'name'
      )
    ).toEqual({ org1: 3, org2: 2, org3: null });
  });

  it('relatedExists is true only when a matching record exists', async () => {
    expect(
      await compute(
        organization,
        '{{calc.relatedExists(\'teams\'; \'{"field":"active","operator":"eq","value":false}\')}}',
        'has_inactive_team',
        'name'
      )
    ).toEqual({ org1: true, org2: false, org3: false });
  });

  it('relatedSum / relatedMax aggregate a child field', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedSum('teams'; 'grade')}}",
        'grade_sum',
        'name'
      )
    ).toEqual({ org1: 6, org2: 2, org3: 0 });
    expect(
      await compute(
        organization,
        "{{calc.relatedMax('teams'; 'grade')}}",
        'grade_max',
        'name'
      )
    ).toEqual({ org1: 3, org2: 2, org3: null });
  });

  it('resolves reverse links stored in multi-select (array) fields', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedCount('experts')}}",
        'expert_count',
        'name'
      )
    ).toEqual({ org1: 2, org2: 1, org3: 0 });
  });

  it('composes with other calc operations', async () => {
    expect(
      await compute(
        organization,
        "{{calc.gt({{calc.relatedCount('teams')}}; 1)}}",
        'has_several_teams',
        'name'
      )
    ).toEqual({ org1: true, org2: false, org3: false });
  });

  it('aggregates over forward links (record ids stored on the current record)', async () => {
    // The emergency stores its grade record ids in data.grade_history
    const grade = await new Resource({
      name: 'grade',
      fields: [
        { name: 'grades', type: 'text' },
        { name: 'grading_date', type: 'date' },
      ],
    }).save();
    const emergency = await new Resource({
      name: 'emergency',
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'grade_history',
          type: 'resources',
          resource: String(grade._id),
          relatedName: 'emergency_grade',
        },
      ],
    }).save();

    const [g1, g2, g3] = await Promise.all([
      seedRecord(grade, {
        grades: 'Grade 1',
        grading_date: new Date('2026-01-01'),
      }),
      seedRecord(grade, {
        grades: 'Grade 3',
        grading_date: new Date('2026-05-01'),
      }),
      seedRecord(grade, {
        grades: 'Grade 2',
        grading_date: new Date('2026-03-01'),
      }),
    ]);
    await Promise.all([
      seedRecord(emergency, {
        name: 'e1',
        grade_history: [String(g1._id), String(g2._id), String(g3._id)],
      }),
      seedRecord(emergency, { name: 'e2', grade_history: [String(g1._id)] }),
      seedRecord(emergency, { name: 'e3' }),
    ]);

    expect(
      await compute(
        emergency,
        "{{calc.relatedValue('grade_history'; 'grades'; 'grading_date'; 'desc')}}",
        'latest_grade',
        'name'
      )
    ).toEqual({ e1: 'Grade 3', e2: 'Grade 1', e3: null });
    expect(
      await compute(
        emergency,
        "{{calc.relatedCount('grade_history')}}",
        'grade_count',
        'name'
      )
    ).toEqual({ e1: 3, e2: 1, e3: 0 });
  });

  it('runs inside a $facet after pagination, as placed by the records query', async () => {
    // Mirrors the all.ts skip-based aggregation: display-only related fields
    // are appended after $skip/$limit inside the items facet
    const service = new CalculatedFieldService(organization, null, 'UTC');
    const stages = await service.build(
      "{{calc.relatedCount('teams')}}",
      'team_count'
    );
    const aggregation = await Record.aggregate([
      { $match: { resource: organization._id } },
    ]).facet({
      items: [
        { $project: { _id: 1, data: 1 } },
        { $sort: { 'data.name': 1 } },
        { $skip: 0 },
        { $limit: 2 },
        ...(stages as any[]),
      ],
      totalCount: [{ $count: 'count' }],
    });
    expect(aggregation[0].totalCount[0].count).toBe(3);
    expect(
      aggregation[0].items.map((r: any) => [r.data.name, r.data.team_count])
    ).toEqual([
      ['org1', 3],
      ['org2', 1],
    ]);
  });
});
