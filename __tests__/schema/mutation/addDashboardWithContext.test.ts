import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Page, Dashboard } from '@models';

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
 * Test Add Dashboard with Context Mutation.
 */
describe('Add dashboard with context tests cases', () => {
  const mutation = `mutation addDashboardWithContext($page: ID!, $element: JSON, $record: ID) {
    addDashboardWithContext(page: $page, element: $element, record: $record) {
      id
      name
    }
  }`;

  test('test case add dashboard with context tests with correct data', async () => {
    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      element: { key: 'value' }, // Modify this based on your expected input
      record: 'recordId', // Modify this based on your expected input
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDashboardWithContext).toHaveProperty('id');
  });

  test('test case add dashboard with context tests with correct data', async () => {
    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      element: { key: 'value' }, // Modify this based on your expected input
      record: 'recordId', // Modify this based on your expected input
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDashboardWithContext).toHaveProperty('id');
  });

  test('test case without authorization and return error', async () => {
    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      element: { key: 'value' },
      record: 'recordId',
    };

    const invalidToken = 'Bearer invalidToken';
    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', invalidToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Not authorized');
  });

  test('test case with insufficient permissions and return error', async () => {
    const nonAdminToken = `Bearer ${await acquireToken()}`;

    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      element: { key: 'value' },
      record: 'recordId',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted');
  });

  test('test case with invalid page ID and return error', async () => {
    const invalidPageId = 'invalidPageId';
    const variables = {
      page: invalidPageId,
      element: { key: 'value' },
      record: 'recordId',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('dataNotFound');
  });

  test('test case with invalid arguments and return error', async () => {
    const variables = {
      page: 'validPageId',
      element: '', // Invalid element
      record: 'recordId',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('invalidArguments');
  });
});
