import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Group, Role } from '@models';

let server: ApolloServer;

/**
 * Test Groups query.
 */
describe('Groups query tests', () => {
  const query = '{ groups { id, title } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });

    expect(result).toHaveProperty(['data', 'groups']);
    expect(result.data?.groups).toEqual(null);
  });
  test('query with admin user returns expected number of groups', async () => {
    const count = await Group.countDocuments();
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
    expect(result).toHaveProperty(['data', 'groups']);
    expect(result.data?.groups.length).toEqual(count);
    result.data?.groups.forEach((prop) => {
      expect(prop).toHaveProperty('title');
    });
  });
});
