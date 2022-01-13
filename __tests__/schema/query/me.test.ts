import { ApolloServer } from 'apollo-server-express';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { User } from '../../../src/models';

let server: ApolloServer;

describe('ME query tests', () => {
  const query = '{ me { id username } }';

  test('query with no token returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, null);
    const result = await server.executeOperation({ query });
    console.log(result);
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['errors']);
  });

  test('query with token should return user info', async () => {
    const dummyUser = await new User({ username: 'dummy', roles: [] }).save();
    // const user = await dummyUser.save();
    server = await SafeTestServer.createApolloTestServer(schema, dummyUser);
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data']);
    expect(result.data?.me.id).toEqual(dummyUser.id);
    expect(result.data?.me.username).toEqual(dummyUser.username);
  });
});
