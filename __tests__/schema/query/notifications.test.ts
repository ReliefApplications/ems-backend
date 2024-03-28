import { Notification, Role, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import { accessibleBy } from '@casl/mongoose';

import supertest from 'supertest';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Notifications query.
 */
describe('Notifications query tests', () => {
  const query = '{ notifications { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty([
      'data',
      'notifications',
      'totalCount',
    ]);
    expect(response.body.data?.notifications.edges).toEqual([]);
    expect(response.body.data?.notifications.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of notifications', async () => {
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
    const user = await User.findOne({ username: 'dummy@dummy.com' }).populate({
      // Add to the user context all roles / permissions it has
      path: 'roles',
      model: 'Role',
      populate: {
        path: 'permissions',
        model: 'Permission',
      },
    });
    const ability = defineUserAbility(user);

    const abilityFilters = Notification.find(
      accessibleBy(ability, 'read').Notification
    ).getFilter();

    const filters: any[] = [abilityFilters];
    const cursorFilters = {};

    const count = await Notification.countDocuments({
      $and: [cursorFilters, ...filters],
    });

    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty([
      'data',
      'notifications',
      'totalCount',
    ]);
    expect(response.body.data?.notifications.totalCount).toEqual(count);
  });
});
