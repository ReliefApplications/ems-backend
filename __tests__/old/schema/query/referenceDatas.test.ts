import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { ReferenceData, Role } from '@models';

let server: ApolloServer;

/**
 * Test ReferenceDatas query.
 */
describe('ReferenceDatas query tests', () => {
  const query = '{ referenceDatas { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'referenceDatas', 'totalCount']);
    expect(result.data?.referenceDatas.edges).toEqual([]);
    expect(result.data?.referenceDatas.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of referenceDatas', async () => {
    const count = await ReferenceData.countDocuments();
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
    expect(result).toHaveProperty(['data', 'referenceDatas', 'totalCount']);
    expect(result.data?.referenceDatas.totalCount).toEqual(count);
  });
});
