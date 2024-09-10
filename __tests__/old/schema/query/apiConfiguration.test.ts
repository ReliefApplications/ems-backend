import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { ApiConfiguration } from '@models';
import { faker } from '@faker-js/faker';
import { status, authType } from '@const/enumTypes';
import supertest from 'supertest';

let server: SafeTestServer;
let apiConfiguration;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  apiConfiguration = await new ApiConfiguration({
    name: faker.word.adjective(),
    status: status.pending,
    authType: authType.serviceToService,
    endpoint: faker.internet.url(),
    graphQLEndpoint: `${faker.internet.url()}/graphql`,
    pingUrl: 'PR',
    settings: {
      authTargetUrl: faker.internet.url(),
      apiClientID: faker.datatype.uuid(),
      safeSecret: faker.datatype.uuid(),
      scope: faker.word.adjective(),
    },
  }).save();
});
afterAll(async () => {
  await ApiConfiguration.deleteOne({ _id: apiConfiguration._id });
});

/**
 * Test ApiConfiguration query.
 */
describe('ApiConfiguration query tests', () => {
  const query =
    'query getApiConfiguration($id: ID!) {\
      apiConfiguration(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: apiConfiguration._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.apiConfiguration).toBeNull();
  });

  test('query with admin user returns expected ApiConfiguration', async () => {
    const variables = {
      id: apiConfiguration._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.apiConfiguration).toHaveProperty('id');
  });
});
