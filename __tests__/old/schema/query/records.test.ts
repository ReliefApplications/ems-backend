import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Record, Role } from '@models';

let server: ApolloServer;

/**
 * Test Records query.
 */
describe('Records query tests', () => {
  const query = '{ records { id } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });

    expect(result).toHaveProperty(['data', 'records']);
    expect(result.data?.records).toEqual(null);
  });
  test('query with admin user returns expected number of records', async () => {
    const count = await Record.countDocuments();
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
    expect(result).toHaveProperty(['data', 'records']);
    expect(result.data?.records.length).toEqual(count);
    result.data?.records.forEach((prop) => {
      expect(prop).toHaveProperty('id');
    });
  });
});
