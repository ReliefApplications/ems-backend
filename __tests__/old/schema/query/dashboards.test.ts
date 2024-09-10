import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Dashboard, Role } from '@models';

let server: ApolloServer;

/**
 * Test Dashboards query.
 */
describe('Dashboards query tests', () => {
  const query = '{ dashboards(all:true) { id, name } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });

    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'dashboards']);
    expect(result.data?.dashboards).toEqual(null);
  });
  test('query with admin user returns expected number of dashboards', async () => {
    const count = await Dashboard.countDocuments();
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
    expect(result).toHaveProperty(['data', 'dashboards']);
    expect(result.data?.dashboards.length).toEqual(count);
    result.data?.dashboards.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
