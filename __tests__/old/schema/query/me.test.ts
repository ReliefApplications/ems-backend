import { User } from '../../../src/models';

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
 * Test ME query.
 */
describe('ME query tests', () => {
  const query = '{ me { id username } }';

  test('query with no token returns error', async () => {
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Accept', 'application/json');
    expect(response.body).toHaveProperty(['errors']);
  });

  test('query with token should return user info', async () => {
    const user = await User.findOne({ username: 'dummy@dummy.com' });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty(['data']);
    expect(response.body.data?.me.id).toEqual(user.id);
    expect(response.body.data?.me.username).toEqual(user.username);
  });
});
