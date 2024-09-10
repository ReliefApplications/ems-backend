import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Group } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let group;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  group = await new Group({
    title: faker.random.alpha(10),
    description: faker.commerce.productDescription(),
    oid: faker.datatype.uuid(),
  }).save();
});
afterAll(async () => {
  await Group.deleteOne({ _id: group._id });
});

/**
 * Test Group query.
 */
describe('Group query tests', () => {
  const query =
    'query getGroup($id: ID!) {\
      group(id: $id) { id, title }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: group._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.group).toBeNull();
  });

  test('query with admin user returns expected group', async () => {
    const variables = {
      id: group._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.group).toHaveProperty('id');
  });
});
