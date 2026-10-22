import { createMongoAbility } from '@casl/ability';
import { Role } from '@models';
import { Context } from '@server/apollo/context';
import editRole from '@schema/mutation/editRole.mutation';
import { DatabaseHelpers } from '../../../helpers/database-helpers';

describe('editRole Resolver', () => {
  let databaseHelpers: DatabaseHelpers;
  let context: Context;

  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  beforeEach(() => {
    context = {
      user: {
        ability: createMongoAbility([{ action: 'update', subject: 'Role' }]),
      },
      i18next: { t: jest.fn((key: string) => key) },
    } as unknown as Context;
  });

  it('removes a rule when the request contains transient query-builder controls', async () => {
    const rule = {
      logic: 'and',
      filters: [
        { field: '{{email}}', operator: 'endswith', value: '@who.int' },
      ],
    };
    const role = await Role.create({
      title: 'Guest',
      application: '507f1f77bcf86cd799439011',
      autoAssignment: [rule],
    });

    await editRole.resolve(
      null,
      {
        id: role.id,
        autoAssignment: {
          remove: {
            logic: 'and',
            filters: [
              {
                ...rule.filters[0],
                inTheLast: { number: 1, unit: 'days' },
              },
            ],
          },
        },
      },
      context
    );

    const savedRole = await Role.findById(role.id);
    expect(savedRole.autoAssignment).toEqual([]);
  });
});
