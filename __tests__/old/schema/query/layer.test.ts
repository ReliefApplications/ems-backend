import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Layer } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let layer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  layer = await new Layer({
    name: faker.random.alpha(10),
  }).save();
});
afterAll(async () => {
  await Layer.deleteOne({ _id: layer._id });
});

/**
 * Test Layer query.
 */
describe('Layer query tests', () => {
  const query =
    'query getLayer($id: ID!) {\
      layer(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: layer._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.layer).toBeNull();
  });

  test('query with admin user returns expected layer', async () => {
    const variables = {
      id: layer._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.layer).toHaveProperty('id');
  });
});
