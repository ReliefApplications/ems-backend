import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Role } from '@models';

let server: ApolloServer;

/**
 * Test Roles query.
 */
describe('Roles query tests', () => {
  const query = '{ roles { id, title } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'roles']);
    expect(result.data?.roles).toEqual([]);
    expect(result.data?.roles.length).toEqual(0);
  });
  test('query with admin user returns expected number of roles', async () => {
    const count = await Role.countDocuments({ application: null });
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
    expect(result).toHaveProperty(['data', 'roles']);
    expect(result.data?.roles.length).toEqual(count);
    result.data?.roles.forEach((prop) => {
      expect(prop).toHaveProperty('title');
    });
  });
});
