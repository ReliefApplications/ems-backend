import { Resource, Role, User } from '@models';

import supertest from 'supertest';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Resources query.
 */
describe('Resources query tests', () => {
  const query = '{ resources { totalCount, edges { node { id } } } }';

  test('query with wrong user returns error', async () => {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty(['data', 'resources', 'totalCount']);
    expect(response.body.data?.resources.edges).toEqual([]);
    expect(response.body.data?.resources.totalCount).toEqual(0);
  });

  test('query with admin user returns expected number of resources', async () => {
    const count = await Resource.countDocuments();
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty(['data', 'resources', 'totalCount']);
    expect(response.body.data?.resources.totalCount).toEqual(count);
  });
});
