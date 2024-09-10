import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Application } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';
import supertest from 'supertest';

let server: SafeTestServer;
let application;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();
});
afterAll(async () => {
  await Application.deleteOne({ _id: application._id });
});

/**
 * Test Application query.
 */
describe('Application query tests', () => {
  const query =
    'query getApplication($id: ID!) {\
      application(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: application._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.application).toBeNull();
  });

  test('query with admin user returns expected application', async () => {
    const variables = {
      id: application._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.application).toHaveProperty('id');
  });
});
