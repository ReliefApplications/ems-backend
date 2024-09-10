import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Resource, Role } from '@models';

let server: ApolloServer;

/**
 * Test Resources query.
 */
describe('Resources query tests', () => {
  const query = '{ resources { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'resources', 'totalCount']);
    expect(result.data?.resources.edges).toEqual([]);
    expect(result.data?.resources.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of resources', async () => {
    const count = await Resource.countDocuments();
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
    expect(result).toHaveProperty(['data', 'resources', 'totalCount']);
    expect(result.data?.resources.totalCount).toEqual(count);
  });
});
