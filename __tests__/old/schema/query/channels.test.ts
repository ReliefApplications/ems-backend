import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Channel, Role } from '@models';

let server: ApolloServer;

/**
 * Test Channels query.
 */
describe('Channels query tests', () => {
  const query = '{ channels { title } }';

  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data', 'channels']);
    expect(result.data?.channels).toEqual([]);
    expect(result.data?.channels.length).toEqual(0);
  });
  test('query with admin user returns expected number of channels', async () => {
    const count = await Channel.countDocuments();
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
    expect(result).toHaveProperty(['data', 'channels']);
    expect(result.data?.channels.length).toEqual(count);
    result.data?.channels.forEach((prop) => {
      expect(prop).toHaveProperty('title');
    });
  });
});
