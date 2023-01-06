import { ApolloServer } from 'apollo-server-express';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Notification, Role } from '@models';

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
    const count = await Notification.countDocuments();
    console.log('count ==>> ', count);
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
    console.log('esult.data ==>> ', result.data);
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'notifications', 'totalCount']);
    expect(result.data?.notifications.totalCount).toEqual(count);
  });
});
