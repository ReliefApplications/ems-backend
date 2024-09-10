import { ApolloServer } from 'apollo-server-express';
import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { User } from '../../../../src/models';

let server: ApolloServer;

/**
 * Test ME query.
 */
describe('ME query tests', () => {
  const query = '{ me { id username } }';

  test('query with no token returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, null);
    // const request: GraphQLRequest {}
    const result = await server.executeOperation({ query });
    expect(result).toHaveProperty(['errors']);
  });

  test('query with token should return user info', async () => {
    let dummyUser: User;
    try {
      dummyUser = await new User({
        username: 'dummy@dummy.com',
        roles: [],
      }).save();
      server = await SafeTestServer.createApolloTestServer(schema, dummyUser);
    } catch {
      dummyUser = await User.findOne({ username: 'dummy@dummy.com' }).populate({
        // Add to the user context all roles / permissions it has
        path: 'roles',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission',
        },
      });
      server = await SafeTestServer.createApolloTestServer(schema, dummyUser);
    }
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
    expect(result).toHaveProperty(['data']);
    expect(result.data?.me.id).toEqual(dummyUser.id);
    expect(result.data?.me.username).toEqual(dummyUser.username);
  });
});
