import { ApolloServer } from '@apollo/server';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { ApiConfiguration, Role } from '@models';

let server: ApolloServer;

/**
 * Test ApiConfigurations query.
 */
describe('ApiConfigurations query tests', () => {
  const query = `apiConfigurations(first: $first, afterCursor: $afterCursor) {
    edges {
      node {
        id
        name
        status
        authType
        endpoint
        pingUrl
        settings
        permissions {
          canSee {
            id
            title
          }
          canUpdate {
            id
            title
          }
          canDelete {
            id
            title
          }
        }
        canSee
        canUpdate
        canDelete
      }
      cursor
    }
    totalCount
    pageInfo {
      hasNextPage
      endCursor
    }
  }`;
  test('query with wrong user returns error', async () => {
    server = await SafeTestServer.createApolloTestServer(schema, {
      name: 'Wrong user',
      roles: [],
    });
    const result = await server.executeOperation({ query });
    //  console.log(JSON.stringify(result, null, 2));
    if (result.body.kind === 'single') {
      expect(result.body.singleResult.errors).toBeDefined();
    } else {
      throw new Error('Unsupported response type: ' + result.body.kind);
    }
  });
  test('query with admin user returns expected number of apiConfigurations', async () => {
    const count = await ApiConfiguration.countDocuments();
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
    console.log(result);
    //console.log(JSON.stringify(result, null, 2));
    if (result.body.kind === 'single') {
      expect(result.body.singleResult.errors).toBeUndefined();

      const apiConfigurations = result.body.singleResult.data
        ?.apiConfigurations as { totalCount?: number };

      expect(apiConfigurations).toHaveProperty(['totalCount']);
      expect(apiConfigurations?.totalCount).toEqual(count);
    } else {
      throw new Error('Unsupported response type: ' + result.body.kind);
    }
  });
});
