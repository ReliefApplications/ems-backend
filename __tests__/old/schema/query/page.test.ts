import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Dashboard, Page } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { contentType } from '@const/enumTypes';

let server: SafeTestServer;
let page;
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

  page = await new Page({
    name: faker.word.adjective(),
    type: contentType.dashboard,
    content: dashboard._id,
  }).save();
});
afterAll(async () => {
  await Page.deleteOne({ _id: page._id });
});

/**
 * Test Page query.
 */
describe('Page query tests', () => {
  const query =
    'query getPage($id: ID!) {\
      page(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: page._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.page).toBeNull();
  });

  test('query with admin user returns expected page', async () => {
    const variables = {
      id: page._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.page).toHaveProperty('id');
  });
});
