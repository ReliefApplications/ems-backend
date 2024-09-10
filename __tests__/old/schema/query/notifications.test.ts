import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Notification, Role, User } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import { accessibleBy } from '@casl/mongoose';

let server: ApolloServer;

/**
 * Test Notifications query.
 */
describe('Notifications query tests', () => {
  const query = '{ notifications { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'notifications', 'totalCount']);
    expect(result.data?.notifications.edges).toEqual([]);
    expect(result.data?.notifications.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of notifications', async () => {
    const role = await Role.findOne(
      { title: 'admin' },
      'id permissions'
    ).populate({
      path: 'permissions',
      model: 'Permission',
    });
    let user = await User.findOne({ username: 'dummy@dummy.com' });
    if (!user) {
      user = await new User({
        firstName: 'dummy',
        lastName: 'dummy',
        username: 'dummy1@dummy.com',
        role: [role._id],
      }).save();
    }

    user.roles = [role];
    const ability = defineUserAbility(user);

    const abilityFilters = Notification.find(
      accessibleBy(ability, 'read').Notification
    ).getFilter();

    const filters: any[] = [abilityFilters];
    const cursorFilters = {};

    const count = await Notification.countDocuments({
      $and: [cursorFilters, ...filters],
    });

    const admin = await Role.findOne(
      { title: 'admin' },
      'id permissions'
    ).populate({
      path: 'permissions',
      model: 'Permission',
    });

    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Admin user',
      roles: [admin],
    });
    const result = await server.executeOperation({ query });

    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'notifications', 'totalCount']);
    expect(result.data?.notifications.totalCount).toEqual(count);
  });
});
