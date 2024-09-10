import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { PullJob, Role } from '@models';

let server: ApolloServer;

/**
 * Test PullJob query.
 */
describe('PullJob query tests', () => {
  const query = '{ pullJobs { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'pullJobs', 'totalCount']);
    expect(result.data?.pullJobs.edges).toEqual([]);
    expect(result.data?.pullJobs.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of pullJobs', async () => {
    const count = await PullJob.countDocuments();
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
    expect(result).toHaveProperty(['data', 'pullJobs', 'totalCount']);
    expect(result.data?.pullJobs.totalCount).toEqual(count);
  });
});
