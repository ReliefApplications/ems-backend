import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Dashboard } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let dashboard;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  dashboard = await new Dashboard({
    name: faker.word.adjective(),
  }).save();
});
afterAll(async () => {
  await Dashboard.deleteOne({ _id: dashboard._id });
});

/**
 * Test Dashboard query.
 */
describe('Dashboard query tests', () => {
  const query =
    'query getDashboard($id: ID!) {\
      dashboard(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: dashboard._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.dashboard).toBeNull();
  });

  test('query with admin user returns expected dashboard', async () => {
    const variables = {
      id: dashboard._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.dashboard).toHaveProperty('id');
  });
});
