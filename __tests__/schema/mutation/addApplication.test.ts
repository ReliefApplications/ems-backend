import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User } from '@models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Add Application Mutation.
 */
describe('Add application mutation tests cases', () => {
  const query = `mutation addApplication {
    addApplication {
      id
      name
    }
  }`;

  test('test case add application tests with correct data', async () => {
    const variables = {};

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
  }, 30000);
});
