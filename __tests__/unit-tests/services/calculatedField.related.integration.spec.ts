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
    const country = await new Resource({
      name: 'country',
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
        { name: 'country', type: 'resource', resource: String(country._id) },
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

    const [france, spain] = await Promise.all([
      seedRecord(country, { name: 'France' }),
      seedRecord(country, { name: 'Spain' }),
    ]);

    // org1: three teams (one inactive), grades over time + one archived team
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't1',
      active: true,
      grade: 3,
      graded_on: new Date('2026-01-01'),
      country: String(france._id),
    });
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't2',
      active: true,
      grade: 1,
      graded_on: new Date('2026-03-01'),
      country: String(spain._id),
    });
    await seedRecord(team, {
      organization: String(org1._id),
      label: 't3',
      active: false,
      grade: 2,
      graded_on: new Date('2026-02-01'),
      country: String(france._id),
    });
    await seedRecord(
      team,
      {
        organization: String(org1._id),
        label: 'archived',
        active: true,
        grade: 5,
        graded_on: new Date('2026-04-01'),
        country: String(france._id),
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
      country: String(france._id),
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

  it('relatedCount filters on a subfield of a linked record (resource field)', async () => {
    // org1: t1 & t3 are French (t2 is Spanish, archived one ignored), org2: t4 is French
    expect(
      await compute(
        organization,
        '{{calc.relatedCount(\'teams\'; \'{"field":"country.name","operator":"eq","value":"France"}\')}}',
        'french_teams',
        'name'
      )
    ).toEqual({ org1: 2, org2: 1, org3: 0 });
  });

  it('combines linked-record subfield filters with plain child filters', async () => {
    // org1: only t1 is both active and French (t3 is inactive)
    expect(
      await compute(
        organization,
        '{{calc.relatedCount(\'teams\'; \'{"logic":"and","filters":[{"field":"active","operator":"eq","value":true},{"field":"country.name","operator":"eq","value":"France"}]}\')}}',
        'active_french_teams',
        'name'
      )
    ).toEqual({ org1: 1, org2: 1, org3: 0 });
  });

  it('relatedValue applies a linked-record subfield filter before picking a value', async () => {
    // org1 French teams: t1 (grade 3, Jan) & t3 (grade 2, Feb) → latest is t3
    expect(
      await compute(
        organization,
        '{{calc.relatedValue(\'teams\'; \'grade\'; \'graded_on\'; \'desc\'; \'{"field":"country.name","operator":"eq","value":"France"}\')}}',
        'latest_french_grade',
        'name'
      )
    ).toEqual({ org1: 2, org2: 2, org3: null });
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

  it('computes averages over the related records', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedAvg('teams'; 'grade')}}",
        'grade_avg',
        'name'
      )
    ).toEqual({ org1: 2, org2: 2, org3: null });
  });

  it('supports composite OR filters on the related records', async () => {
    expect(
      await compute(
        organization,
        '{{calc.relatedCount(\'teams\'; \'{"logic":"or","filters":[{"field":"active","operator":"eq","value":false},{"field":"grade","operator":"gte","value":3}]}\')}}',
        'flagged_teams',
        'name'
      )
    ).toEqual({ org1: 2, org2: 0, org3: 0 });
  });

  it('supports date operators in the related-record filter', async () => {
    expect(
      await compute(
        organization,
        '{{calc.relatedCount(\'teams\'; \'{"field":"graded_on","operator":"gte","value":"2026-02-01"}\')}}',
        'recent_gradings',
        'name'
      )
    ).toEqual({ org1: 2, org2: 0, org3: 0 });
  });

  it('picks a value using a record-level (createdAt) sort field', async () => {
    expect(
      await compute(
        organization,
        "{{calc.relatedValue('teams'; 'label'; 'createdAt'; 'desc')}}",
        'newest_team',
        'name'
      )
    ).toEqual({ org1: 't3', org2: 't4', org3: null });
  });

  it('supports sorting parents by the computed value, as the records query does', async () => {
    const service = new CalculatedFieldService(organization, null, 'UTC');
    const stages = await service.build(
      "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'desc')}}",
      'latest_grade'
    );
    const sorted = await Record.aggregate([
      { $match: { resource: organization._id } },
      ...(stages as any[]),
      { $sort: { 'data.latest_grade': -1, _id: 1 } },
    ]);
    // latest grades: org1 → 1, org2 → 2, org3 → null (sorted last on desc)
    expect(sorted.map((r: any) => r.data.name)).toEqual([
      'org2',
      'org1',
      'org3',
    ]);
  });

  it('supports filtering parents on the computed value, as the records query does', async () => {
    const service = new CalculatedFieldService(organization, null, 'UTC');
    const stages = await service.build(
      "{{calc.relatedCount('teams')}}",
      'team_count'
    );
    const filtered = await Record.aggregate([
      { $match: { resource: organization._id } },
      ...(stages as any[]),
      { $match: { 'data.team_count': { $gte: 2 } } },
    ]);
    expect(filtered.map((r: any) => r.data.name)).toEqual(['org1']);
  });

  it('aggregates over single-link (resource) fields and ignores dangling ids', async () => {
    const profile = await new Resource({
      name: 'profile',
      fields: [{ name: 'level', type: 'numeric' }],
    }).save();
    const person = await new Resource({
      name: 'person',
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'profile',
          type: 'resource',
          resource: String(profile._id),
          relatedName: 'persons',
        },
      ],
    }).save();

    const p1Profile = await seedRecord(profile, { level: 5 });
    await Promise.all([
      seedRecord(person, { name: 'p1', profile: String(p1Profile._id) }),
      seedRecord(person, { name: 'p2' }),
      // Dangling id (deleted record) and a value that is not an ObjectId
      seedRecord(person, {
        name: 'p3',
        profile: String(new mongoose.Types.ObjectId()),
      }),
      seedRecord(person, { name: 'p4', profile: 'garbage' }),
    ]);

    expect(
      await compute(
        person,
        "{{calc.relatedValue('profile'; 'level'; 'createdAt'; 'desc')}}",
        'profile_level',
        'name'
      )
    ).toEqual({ p1: 5, p2: null, p3: null, p4: null });
    expect(
      await compute(
        person,
        "{{calc.relatedExists('profile')}}",
        'has_profile',
        'name'
      )
    ).toEqual({ p1: true, p2: false, p3: false, p4: false });
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

  it('filters the related records on a calculated field of the child resource', async () => {
    const org = await new Resource({
      name: 'org_tfp',
      fields: [{ name: 'name', type: 'text' }],
    }).save();
    const assignment = await new Resource({
      name: 'assignment_expert_resource',
      fields: [
        {
          name: 'organization',
          type: 'resource',
          resource: String(org._id),
          relatedName: 'assignment_expert',
        },
        { name: 'actual', type: 'boolean' },
        {
          name: 'is_tfp',
          type: 'boolean',
          isCalculated: true,
          expression:
            '{{calc.and( {{calc.exists( {{data.organization}} )}} ; {{calc.eq( {{data.actual}} ; true )}})}}',
        },
      ],
    }).save();

    const [o1, o2] = await Promise.all([
      seedRecord(org, { name: 'o1' }),
      seedRecord(org, { name: 'o2' }),
    ]);
    await seedRecord(org, { name: 'o3' });
    await Promise.all([
      seedRecord(assignment, { organization: String(o1._id), actual: true }),
      seedRecord(assignment, { organization: String(o1._id), actual: false }),
      seedRecord(assignment, { organization: String(o1._id), actual: true }),
      seedRecord(assignment, { organization: String(o2._id), actual: false }),
    ]);

    expect(
      await compute(
        org,
        '{{calc.relatedCount(\'assignment_expert\'; \'{"logic":"and","filters":[{"field":"is_tfp","operator":"eq","value":true}]}\')}}',
        'tfp_experts',
        'name'
      )
    ).toEqual({ o1: 2, o2: 0, o3: 0 });
  });

  it('aggregates a calculated value field of the child resource', async () => {
    const shop = await new Resource({
      name: 'shop',
      fields: [{ name: 'name', type: 'text' }],
    }).save();
    const sale = await new Resource({
      name: 'sale',
      fields: [
        {
          name: 'shop',
          type: 'resource',
          resource: String(shop._id),
          relatedName: 'sales',
        },
        { name: 'amount', type: 'numeric' },
        {
          name: 'amount_x2',
          type: 'numeric',
          isCalculated: true,
          expression: '{{calc.mul({{data.amount}}; 2)}}',
        },
      ],
    }).save();

    const [s1] = await Promise.all([
      seedRecord(shop, { name: 's1' }),
      seedRecord(shop, { name: 's2' }),
    ]);
    await Promise.all([
      seedRecord(sale, { shop: String(s1._id), amount: 2 }),
      seedRecord(sale, { shop: String(s1._id), amount: 3 }),
    ]);

    expect(
      await compute(
        shop,
        "{{calc.relatedSum('sales'; 'amount_x2')}}",
        'total_x2',
        'name'
      )
    ).toEqual({ s1: 10, s2: 0 });
  });

  it('filters on a calculated field of a record linked to the child (dot notation)', async () => {
    const countryWithCalc = await new Resource({
      name: 'country_with_calc',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'population', type: 'numeric' },
        {
          name: 'is_big',
          type: 'boolean',
          isCalculated: true,
          expression: '{{calc.gte({{data.population}}; 1000)}}',
        },
      ],
    }).save();
    const club = await new Resource({
      name: 'club',
      fields: [{ name: 'name', type: 'text' }],
    }).save();
    const member = await new Resource({
      name: 'member',
      fields: [
        {
          name: 'club',
          type: 'resource',
          resource: String(club._id),
          relatedName: 'members',
        },
        {
          name: 'country',
          type: 'resource',
          resource: String(countryWithCalc._id),
        },
      ],
    }).save();

    const [big, small, c1, c2] = await Promise.all([
      seedRecord(countryWithCalc, { name: 'big', population: 2000 }),
      seedRecord(countryWithCalc, { name: 'small', population: 10 }),
      seedRecord(club, { name: 'c1' }),
      seedRecord(club, { name: 'c2' }),
    ]);
    await Promise.all([
      seedRecord(member, { club: String(c1._id), country: String(big._id) }),
      seedRecord(member, { club: String(c1._id), country: String(big._id) }),
      seedRecord(member, { club: String(c1._id), country: String(small._id) }),
      seedRecord(member, { club: String(c2._id), country: String(small._id) }),
    ]);

    expect(
      await compute(
        club,
        '{{calc.relatedCount(\'members\'; \'{"field":"country.is_big","operator":"eq","value":true}\')}}',
        'big_country_members',
        'name'
      )
    ).toEqual({ c1: 2, c2: 0 });
  });

  it('terminates when calculated fields reference each other through related filters', async () => {
    const resourceA = await new Resource({
      name: 'circular_a',
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'valid_items',
          type: 'numeric',
          isCalculated: true,
          expression:
            '{{calc.relatedCount(\'items\'; \'{"field":"is_valid","operator":"eq","value":true}\')}}',
        },
      ],
    }).save();
    const resourceB = await new Resource({
      name: 'circular_b',
      fields: [
        {
          name: 'a',
          type: 'resource',
          resource: String(resourceA._id),
          relatedName: 'items',
        },
        {
          name: 'is_valid',
          type: 'boolean',
          isCalculated: true,
          expression:
            "{{calc.gt({{calc.relatedValue('a'; 'valid_items'; 'createdAt'; 'desc')}}; 0)}}",
        },
      ],
    }).save();

    const a1 = await seedRecord(resourceA, { name: 'a1' });
    await seedRecord(resourceB, { a: String(a1._id) });

    // The circular branch is skipped with a warning instead of recursing
    // forever; the computation still resolves to a number
    const result = await compute(
      resourceA,
      '{{calc.relatedCount(\'items\'; \'{"field":"is_valid","operator":"eq","value":true}\')}}',
      'valid_items',
      'name'
    );
    expect(typeof result.a1).toBe('number');
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
