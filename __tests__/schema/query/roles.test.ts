import { Role, User } from '@models';

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
 * Test Roles query.
 */
describe('Roles query tests', () => {
  const query = '{ roles { id, title } }';

  test('query with admin user returns expected number of roles', async () => {
    const count = await Role.countDocuments({ application: null });
    console.log('the count is equal to :', count);
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
    expect(response.body).toHaveProperty(['data', 'roles']);
    console.log('The query returns :', response.body.data?.roles.length);
    expect(response.body.data?.roles.length).toEqual(count);
    response.body.data?.roles.forEach((prop) => {
      expect(prop).toHaveProperty('title');
    });
  });
});
