import { ApolloServer } from 'apollo-server-express';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Step, Role } from '@models';

let server: ApolloServer;

/**
 * Test Steps query.
 */
describe('Steps query tests', () => {
  const query = '{ steps { id, name } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'steps']);
    expect(result.data?.steps).toEqual([]);
    expect(result.data?.steps.length).toEqual(0);
  });
  test('query with admin user returns expected number of steps', async () => {
    const count = await Step.countDocuments();
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
    expect(result).toHaveProperty(['data', 'steps']);
    expect(result.data?.steps.length).toEqual(count);
    result.data?.steps.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
