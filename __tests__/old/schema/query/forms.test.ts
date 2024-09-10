import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Form, Role } from '@models';

let server: ApolloServer;

/**
 * Test Forms query.
 */
describe('Forms query tests', () => {
  const query = '{ forms { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'forms', 'totalCount']);
    expect(result.data?.forms.edges).toEqual([]);
    expect(result.data?.forms.totalCount).toEqual(0);
  });
  test('query with admin user returns expected number of forms', async () => {
    const count = await Form.countDocuments();
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
    expect(result).toHaveProperty(['data', 'forms', 'totalCount']);
    expect(result.data?.forms.totalCount).toEqual(count);
  });
});
