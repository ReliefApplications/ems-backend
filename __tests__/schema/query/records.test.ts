import { Record, Role, User } from '@models';

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
 * Test Records query.
 */
describe('Records query tests', () => {
  const query = '{ records { id } }';

  test('query with wrong user returns error', async () => {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty(['data', 'records']);
    expect(response.body.data?.records).toEqual(null);
  });

  test('query with admin user returns expected number of records', async () => {
    const count = await Record.countDocuments();
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
    expect(response.status).toBe(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty(['data', 'records']);
    expect(response.body.data?.records.length).toEqual(count);
    response.body.data?.records.forEach((prop) => {
      expect(prop).toHaveProperty('id');
    });
  });
});
