import mongoose from 'mongoose';
import { Ability } from '@casl/ability';
import { Record, Resource } from '@models';
import getAllResolver from '@utils/schema/resolvers/Query/all';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { DatabaseHelpers } from '../../../../../helpers/database-helpers';

jest.mock('@services/logger.service');
jest.mock('@schema/shared', () => ({ graphQLAuthCheck: jest.fn() }));
jest.mock('@security/extendAbilityForRecords', () => ({
  __esModule: true,
  default: jest.fn(),
}));

/**
 * Builds the GraphQL info of a records query selecting the given node fields.
 *
 * @param nodeFields Fields selected on the node
 * @returns Fake GraphQL info
 */
const buildInfo = (nodeFields: string[]) => ({
  fieldNodes: [
    {
      selectionSet: {
        selections: [
          {
            name: { value: 'edges' },
            selectionSet: {
              selections: [
                {
                  name: { value: 'node' },
                  selectionSet: {
                    selections: nodeFields.map((name) => ({
                      name: { value: name },
                      arguments: [],
                    })),
                  },
                },
              ],
            },
          },
          { name: { value: 'totalCount' } },
        ],
      },
    },
  ],
});

describe('records query with a calculated field as display field', () => {
  let databaseHelpers: DatabaseHelpers;
  let resource: any;
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
          name: 'label',
          type: 'text',
          isCalculated: true,
          expression: "{{calc.concat({{data.name}}; ' - '; {{data.population}})}}",
        },
      ],
    }).save();

    const formId = new mongoose.Types.ObjectId();
    let seq = 0;
    for (const data of [
      { name: 'France', population: 67 },
      { name: 'Germany', population: 83 },
      { name: 'Belgium', population: 11 },
    ]) {
      await new Record({
        incrementalId: `2026-D${String(++seq).padStart(7, '0')}`,
        form: formId,
        _form: { _id: formId, name: 'country' },
        resource: resource._id,
        data,
      }).save();
    }

    const ability = new Ability([{ action: 'manage', subject: 'all' }]);
    (extendAbilityForRecords as jest.Mock).mockResolvedValue(ability);
    context = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        attributes: {},
        ability,
      },
      timeZone: 'UTC',
      i18next: { t: (key: string) => key },
    };
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  /**
   * Runs the records query, as the resource question loader does.
   *
   * @param args Query arguments
   * @returns Query result
   */
  const query = (args: any) =>
    getAllResolver(
      'Country',
      { Country: resource.fields },
      { Country: resource._id }
    )(null, args, context, buildInfo(['id', 'label']));

  it('computes and sorts on the calculated display field', async () => {
    const result = await query({
      first: 50,
      skip: 0,
      sortField: 'label',
      sortOrder: 'asc',
      filter: {},
    });

    expect(result.totalCount).toBe(3);
    expect(result.edges.map((x: any) => x.node.data.label)).toEqual([
      'Belgium - 11',
      'France - 67',
      'Germany - 83',
    ]);
  });

  it('searches on the calculated display field', async () => {
    const result = await query({
      first: 50,
      skip: 0,
      sortField: 'label',
      sortOrder: 'asc',
      filter: { field: 'label', operator: 'contains', value: 'man' },
    });

    expect(result.totalCount).toBe(1);
    expect(result.edges[0].node.data.label).toBe('Germany - 83');
  });
});
