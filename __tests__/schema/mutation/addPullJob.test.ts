import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User } from '@models';
import who from '../../../config/who';

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
 * Test Add PullJob Mutation.
 */
describe('Add pull job tests cases', () => {
  const query = `mutation addPullJob($name: String!, $status: StatusEnumType!, $apiConfiguration: ID!, $url: String, $path: String, $schedule: String, $convertTo: ID, $mapping: JSON, $uniqueIdentifiers: [String], $channel: ID) {
    addPullJob(name: $name, status: $status, apiConfiguration: $apiConfiguration, url: $url, path: $path, schedule: $schedule, convertTo: $convertTo, mapping: $mapping, uniqueIdentifiers: $uniqueIdentifiers, channel: $channel) {
      id
      name
      status
    }
  }`;

  const apiConfigurationId = who.apiConfiguration;
  test('test case add pull job with correct data', async () => {
    // Make sure to replace these with valid IDs or create test data as needed

    const variables = {
      name: faker.random.alpha(10),
      status: 'active', // or 'inactive' based on your enum
      apiConfiguration: apiConfigurationId,
      // Add other required variables here
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addPullJob).toHaveProperty('id');
  });

  test('test case add pull job with wrong API configuration ID returns error', async () => {
    const variables = {
      name: faker.random.alpha(10),
      status: 'active',
      apiConfiguration: apiConfigurationId,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('dataNotFound');
  });

  test('test case add pull job with insufficient permissions returns error', async () => {
    // Create a user without the necessary permissions
    const nonAdminToken = `Bearer ${await acquireToken()}`;

    const variables = {
      name: faker.random.alpha(10),
      status: 'active',
      apiConfiguration: apiConfigurationId,
      // Add other required variables here
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('permissionNotGranted');
  });

  test('test case add pull job with correct data and inactive status', async () => {
    const variables = {
      name: faker.random.alpha(10),
      status: 'inactive',
      apiConfiguration: apiConfigurationId,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addPullJob).toHaveProperty('id');
  });
});
