import mongoose from 'mongoose';
import { Record, Resource } from '@models';
import { CalculatedFieldService } from '@services/calculatedField.service';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import getSortAggregation from '@utils/schema/resolvers/Query/getSortAggregation';
import { DatabaseHelpers } from '../../../../../helpers/database-helpers';

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
    incrementalId: `2026-D${String(++seq).padStart(7, '0')}`,
    form: formId,
    _form: { _id: formId, name: resource.name },
    resource: resource._id,
    data,
  }).save();
};

describe('filtering on a linked record calculated field, as the records query does', () => {
  let country: any;
  let team: any;

  /**
   * Mirrors the linked-records aggregation the records query (all.ts) builds
   * for a `country` resource field: the used calculated fields of the linked
   * resource are computed inside the lookup sub-pipeline.
   *
   * @param usedSubFields Subfields of the linked resource used by the filter/sort
   * @returns The linked-records aggregation stages
   */
  const buildLinkedRecordsAggregation = async (usedSubFields: string[]) => {
    const usedCalculatedFields = country.fields.filter(
      (f: any) => f.isCalculated && usedSubFields.includes(f.name)
    );
    const linkedCalculatedStages: any[] = [];
    const service = new CalculatedFieldService(country, null, 'UTC');
    for (const f of usedCalculatedFields) {
      linkedCalculatedStages.push(
        ...(await service.build(f.expression, f.name))
      );
    }
    return [
      {
        $addFields: {
          'data.country_id': {
            $convert: { input: '$data.country', to: 'objectId', onError: null },
          },
        },
      },
      {
        $lookup: {
          from: 'records',
          localField: 'data.country_id',
          foreignField: '_id',
          as: '_country',
          ...(linkedCalculatedStages.length > 0 && {
            pipeline: linkedCalculatedStages,
          }),
        },
      },
      { $unwind: { path: '$_country', preserveNullAndEmptyArrays: true } },
      { $addFields: { '_country.id': { $toString: '$_country._id' } } },
    ];
  };

  /**
   * Runs the mirrored records-query pipeline over the team records with a
   * filter (and optional sort) on subfields of the linked country record.
   *
   * @param filter Records query filter
   * @param sort Optional sort, as `[sortField, sortOrder]`
   * @returns The labels of the matching team records
   */
  const queryTeams = async (filter: any, sort?: [string, string]) => {
    // Mirrors all.ts: the used subfields of the linked resource are pushed as
    // `<resource>.<subField>` pseudo-fields so getFilter can type them
    const usedSubFields = (filter.filters ?? [filter])
      .map((f: any) => f.field)
      .concat(sort ? [sort[0]] : [])
      .filter((f: string) => f.startsWith('country.'))
      .map((f: string) => f.split('.')[1]);
    const fields = [
      ...team.fields,
      ...country.fields
        .filter((f: any) => usedSubFields.includes(f.name))
        .map((f: any) => ({ ...f, name: `country.${f.name}` })),
    ];
    const context: any = {
      resourceFieldsById: { [String(country._id)]: country.fields },
    };
    const mongooseFilter = getFilter(filter, fields, context);
    const results = await Record.aggregate([
      { $match: { resource: team._id } },
      ...(await buildLinkedRecordsAggregation(usedSubFields)),
      { $match: mongooseFilter },
      ...(sort
        ? await getSortAggregation(sort[0], sort[1], fields, context)
        : [{ $sort: { incrementalId: 1 } }]),
    ]);
    return results.map((r: any) => r.data.label);
  };

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    country = await new Resource({
      name: 'country',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'population', type: 'numeric' },
        {
          name: 'is_big',
          type: 'boolean',
          isCalculated: true,
          expression: '{{calc.gte({{data.population}}; 1000)}}',
        },
        {
          name: 'team_count',
          type: 'numeric',
          isCalculated: true,
          expression: "{{calc.relatedCount('teams')}}",
        },
      ],
    }).save();
    team = await new Resource({
      name: 'team',
      fields: [
        { name: 'label', type: 'text' },
        {
          name: 'country',
          type: 'resource',
          resource: String(country._id),
          relatedName: 'teams',
        },
      ],
    }).save();

    const [france, spain] = await Promise.all([
      seedRecord(country, { name: 'France', population: 2000 }),
      seedRecord(country, { name: 'Spain', population: 500 }),
    ]);
    await seedRecord(team, { label: 't1', country: String(france._id) });
    await seedRecord(team, { label: 't2', country: String(france._id) });
    await seedRecord(team, { label: 't3', country: String(spain._id) });
    await seedRecord(team, { label: 't4' });
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('still filters on a plain subfield of the linked record', async () => {
    expect(
      await queryTeams({
        field: 'country.name',
        operator: 'eq',
        value: 'France',
      })
    ).toEqual(['t1', 't2']);
  });

  it('filters on a calculated field of the linked record', async () => {
    expect(
      await queryTeams({ field: 'country.is_big', operator: 'eq', value: true })
    ).toEqual(['t1', 't2']);
    expect(
      await queryTeams({
        field: 'country.is_big',
        operator: 'eq',
        value: false,
      })
    ).toEqual(['t3']);
  });

  it('filters on a linked calculated field aggregating related records', async () => {
    // team_count is itself a calc.relatedCount — a nested lookup inside the
    // linked-record lookup sub-pipeline
    expect(
      await queryTeams({
        field: 'country.team_count',
        operator: 'gte',
        value: 2,
      })
    ).toEqual(['t1', 't2']);
  });

  it('combines linked calculated and plain filters', async () => {
    expect(
      await queryTeams({
        logic: 'and',
        filters: [
          { field: 'country.is_big', operator: 'eq', value: true },
          { field: 'label', operator: 'eq', value: 't2' },
        ],
      })
    ).toEqual(['t2']);
  });

  it('sorts on a calculated field of the linked record', async () => {
    const labels = await queryTeams(
      { field: 'label', operator: 'neq', value: 't4' },
      ['country.team_count', 'desc']
    );
    // t1 & t2 (count 2) come before t3 (count 1); their relative order is
    // unspecified as they share the sort key
    expect(labels.slice(0, 2).sort()).toEqual(['t1', 't2']);
    expect(labels[2]).toBe('t3');
  });
});
