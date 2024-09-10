import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Application, Role } from '@models';

let server: ApolloServer;

/**
 * Test Applications query.
 */
describe('Applications query tests', () => {
  const query = '{ applications { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'applications', 'totalCount']);
    expect(result.data?.applications.edges).toEqual([]);
    expect(result.data?.applications.totalCount).toEqual(0);
  });
  test('query with admin user returns expected number of applications', async () => {
    const count = await Application.countDocuments();
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
    expect(result).toHaveProperty(['data', 'applications', 'totalCount']);
    expect(result.data?.applications.totalCount).toEqual(count);
  });
});
