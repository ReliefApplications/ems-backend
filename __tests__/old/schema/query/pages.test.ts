import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Page, Role } from '@models';

let server: ApolloServer;

/**
 * Test Pages query.
 */
describe('Pages query tests', () => {
  const query = '{ pages { id, name } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'pages']);
    expect(result.data?.pages).toEqual([]);
    expect(result.data?.pages.length).toEqual(0);
  });
  test('query with admin user returns expected number of pages', async () => {
    const count = await Page.countDocuments();
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
    expect(result).toHaveProperty(['data', 'pages']);
    expect(result.data?.pages.length).toEqual(count);
    result.data?.pages.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
