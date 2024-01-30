import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { ApiConfiguration } from '@models';
import { status } from '@const/enumTypes';
import { ObjectId } from 'bson';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let apiConfiguration: ApiConfiguration;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create ApiConfiguration
  apiConfiguration = await new ApiConfiguration({
    name: faker.random.alpha(10),
    status: status.active,
  }).save();
});

/**
 * Test Add PullJob Mutation.
 */
describe('Add pull job tests cases', () => {
  const query = `mutation addPullJob($name: String!, $status: Status!, $apiConfiguration: ID!, $url: String, $path: String, $schedule: String, $convertTo: ID, $mapping: JSON, $uniqueIdentifiers: [String], $channel: ID) {
    addPullJob(name: $name, status: $status, apiConfiguration: $apiConfiguration, url: $url, path: $path, schedule: $schedule, convertTo: $convertTo, mapping: $mapping, uniqueIdentifiers: $uniqueIdentifiers, channel: $channel) {
      id
      name
      status
    }
  }`;

  test('test case add pull job with correct data', async () => {
    // Make sure to replace these with valid IDs or create test data as needed

    const variables = {
      name: faker.random.alpha(10),
      status: status.active, // or 'inactive' based on your enum
      apiConfiguration: apiConfiguration._id,
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
      apiConfiguration: new ObjectId().toString(),
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Data not found');
  });

  test('test case add pull job with insufficient permissions returns error', async () => {
    await server.removeAdminRoleToUserBeforeTest();
    // Create a user without the necessary permissions
    const nonAdminToken = `Bearer ${await acquireToken()}`;

    const variables = {
      name: faker.random.alpha(10),
      status: 'active',
      apiConfiguration: apiConfiguration._id,
      // Add other required variables here
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted');
    await server.restoreAdminRoleToUserAfterTest();
  });

  test('test case add pull job with correct data and pending status', async () => {
    const variables = {
      name: faker.random.alpha(10),
      status: status.pending,
      apiConfiguration: apiConfiguration._id,
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
