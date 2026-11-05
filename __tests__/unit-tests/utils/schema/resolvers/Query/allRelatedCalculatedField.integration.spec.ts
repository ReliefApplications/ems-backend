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

/** Field selected on the node of a records query, with its sub-fields if any */
type NodeField = string | { name: string; fields: string[] };

/**
 * Builds the GraphQL info of a records query selecting the given node fields.
 *
 * @param nodeFields Fields selected on the node
 * @returns Fake GraphQL info
 */
const buildInfo = (nodeFields: NodeField[]) => ({
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
                    selections: nodeFields.map((field) =>
                      typeof field === 'string'
                        ? { name: { value: field }, arguments: [] }
                        : {
                            name: { value: field.name },
                            arguments: [],
                            selectionSet: {
                              selections: field.fields.map((name) => ({
                                name: { value: name },
                              })),
                            },
                          }
                    ),
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

describe('records query displaying a calculated field of related records', () => {
  let databaseHelpers: DatabaseHelpers;
  let child: any;
  let parent: any;
  let context: any;
  let seq = 0;

  /**
   * Creates a record of a resource.
   *
   * @param resource Resource of the record
   * @param data Data of the record
   * @returns the created record
   */
  const createRecord = async (resource: any, data: any) => {
    const formId = new mongoose.Types.ObjectId();
    return new Record({
      incrementalId: `2026-L${String(++seq).padStart(7, '0')}`,
      form: formId,
      _form: { _id: formId, name: resource.name },
      resource: resource._id,
      data,
    }).save();
  };

  /**
   * Runs the records query of the parent resource.
   *
   * @param nodeFields Fields selected on the records
   * @returns Query result
   */
  const query = (nodeFields: NodeField[]): Promise<any> =>
    getAllResolver(
      'Parent',
      { Parent: parent.fields, Child: child.fields },
      { Parent: parent._id, Child: child._id }
    )(
      null,
      { first: 50, skip: 0, filter: {} } as any,
      context,
      buildInfo(nodeFields)
    );

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();

    child = await new Resource({
      name: 'Child',
      fields: [
        { name: 'firstname', type: 'text' },
        { name: 'lastname', type: 'text' },
        {
          name: 'full_name',
          type: 'text',
          isCalculated: true,
          expression:
            "{{calc.concat( {{data.firstname}} ; ' ' ; {{data.lastname}} )}}",
        },
        {
          name: 'broken',
          type: 'text',
          isCalculated: true,
          expression: '{{calc.unknown( {{data.firstname}} )}}',
        },
      ],
    }).save();
    parent = await new Resource({
      name: 'Parent',
      fields: [
        { name: 'code', type: 'text' },
        {
          name: 'patient',
          type: 'resource',
          resource: child.id,
          relatedName: 'parents',
        },
        {
          name: 'family',
          type: 'resources',
          resource: child.id,
          relatedName: 'families',
        },
      ],
    }).save();

    const john = await createRecord(child, {
      firstname: 'John',
      lastname: 'Smith',
    });
    const jane = await createRecord(child, {
      firstname: 'Jane',
      lastname: 'Doe',
    });
    await createRecord(parent, {
      code: 'P1',
      patient: john.id,
      family: [john.id, jane.id],
    });

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

  it('computes the calculated field of the record of a resource question', async () => {
    const result = await query([
      'id',
      'code',
      { name: 'patient', fields: ['full_name', 'firstname'] },
    ]);

    expect(result.totalCount).toBe(1);
    const patient = result.edges[0].node._relatedRecords.patient;
    expect(patient.data.full_name).toBe('John Smith');
    expect(patient.data.firstname).toBe('John');
  });

  it('computes the calculated field of the records of a resources question', async () => {
    const result = await query([
      'id',
      { name: 'family', fields: ['full_name'] },
    ]);

    const family = result.edges[0].node._relatedRecords.family;
    expect(family.map((x: any) => x.data.full_name).sort()).toEqual([
      'Jane Doe',
      'John Smith',
    ]);
  });

  it('leaves the calculated fields which are not requested', async () => {
    const result = await query([
      'id',
      { name: 'patient', fields: ['firstname'] },
    ]);

    const patient = result.edges[0].node._relatedRecords.patient;
    expect(patient.data.firstname).toBe('John');
    expect(patient.data.full_name).toBeUndefined();
  });

  it('still returns the related records when an expression is broken', async () => {
    const result = await query([
      'id',
      { name: 'patient', fields: ['broken', 'firstname'] },
    ]);

    const patient = result.edges[0].node._relatedRecords.patient;
    expect(patient.data.firstname).toBe('John');
    expect(patient.data.broken).toBeUndefined();
  });
});
