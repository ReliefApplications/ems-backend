import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Dashboard, Step } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { contentType } from '@const/enumTypes';

let server: SafeTestServer;
let step;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const dashboard = await new Dashboard({
    name: faker.word.adjective(),
  }).save();

  step = await new Step({
    name: faker.random.alpha(10),
    type: contentType.dashboard,
    content: dashboard._id,
  }).save();
});
afterAll(async () => {
  await Step.deleteOne({ _id: step._id });
});

/**
 * Test Step query.
 */
describe('Step query tests', () => {
  const query =
    'query getStep($id: ID!) {\
      step(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: step._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.step).toBeNull();
  });

  test('query with admin user returns expected step', async () => {
    const variables = {
      id: step._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.step).toHaveProperty('id');
  });
});
