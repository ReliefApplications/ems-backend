import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Layer, Role } from '@models';

let server: ApolloServer;

/**
 * Test Layers query.
 */
describe('Layers query tests', () => {
  const query = '{ layers { id, name } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });

    expect(result).toHaveProperty(['data', 'layers']);
    expect(result.data?.layers).toEqual(null);
  });
  test('query with admin user returns expected number of layers', async () => {
    const count = await Layer.countDocuments();
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
    expect(result).toHaveProperty(['data', 'layers']);
    expect(result.data?.layers.length).toEqual(count);
    result.data?.layers.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
