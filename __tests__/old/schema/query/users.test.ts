import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { User, Role } from '@models';

let server: ApolloServer;

/**
 * Test Users query.
 */
describe('Users query tests', () => {
  const query = '{ users { id, username } }';

  test('query with admin user returns expected number of users', async () => {
    const count = await User.countDocuments();
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
    expect(result).toHaveProperty(['data', 'users']);
    expect(result.data?.users.length).toEqual(count);
    result.data?.users.forEach((prop) => {
      expect(prop).toHaveProperty('username');
    });
  });
});
