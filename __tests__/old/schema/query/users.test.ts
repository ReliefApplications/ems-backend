import { User, Role } from '@models';

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
 * Test Users query.
 */
describe('Users query tests', () => {
  const query = '{ users { totalCount, edges { node { username }} } }';

  test('query with admin user returns expected number of users', async () => {
    const count = await User.countDocuments();
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
    expect(response.body).toHaveProperty(['data', 'users', 'totalCount']);
    expect(response.body.data.users.totalCount).toEqual(count);
    response.body.data.users.edges.forEach((prop) => {
      expect(prop.node).toHaveProperty('username');
    });
  });
});
