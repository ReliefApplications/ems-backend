import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Workflow, Role } from '@models';

let server: ApolloServer;

/**
 * Test Workflows query.
 */
describe('Workflows query tests', () => {
  const query = '{ workflows { id, name } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    result.errors.forEach((prop) => {
      expect(prop.message).toEqual('Cannot execute "read" on "Workflow"');
    });
    expect(result).toHaveProperty(['data', 'workflows']);
    expect(result.data?.workflows).toEqual(null);
  });

  test('query with admin user returns expected number of workflows', async () => {
    const count = await Workflow.countDocuments();
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
    expect(result).toHaveProperty(['data', 'workflows']);
    expect(result.data?.workflows.length).toEqual(count);
    result.data?.workflows.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
