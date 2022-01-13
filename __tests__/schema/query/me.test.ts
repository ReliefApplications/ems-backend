import { ApolloServer } from 'apollo-server-express';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { User } from '../../../src/models';

let server: ApolloServer;

describe('ME query tests', () => {
  const query = '{ me: { id username } }';

  test('query with no token returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, null);
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeDefined();
  });

  test('query with token should return user info', async () => {
    const dummyUser = new User({ username: 'dummy', roles: [] });
    await dummyUser.save();
    server = await SafeTestServer.createApolloTestServer(schema, dummyUser);
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data']);
    expect(result.data?.id).toEqual(dummyUser.id);
    expect(result.data?.username).toEqual(dummyUser.username);
  });
});
