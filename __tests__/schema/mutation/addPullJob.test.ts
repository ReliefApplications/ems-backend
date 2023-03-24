import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { ApiConfiguration, Role, User } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let apiConfiguration;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  apiConfiguration = await new ApiConfiguration({
    name: faker.random.alpha(10),
  }).save();
});

/**
 * Test Add Pull Job Mutation.
 */
describe('Add pull job tests cases', () => {
  const query = `mutation addPullJob($name: String!,$status: Status!, $apiConfiguration: ID!, $url: String, $path: String, $schedule: String, $convertTo: ID, $mapping: JSON, $uniqueIdentifiers: [String], $channel: ID ) {
    addPullJob(name: $name, status: $status, apiConfiguration: $apiConfiguration, url: $url, path: $path, schedule: $schedule, convertTo: $convertTo, mapping: $mapping, uniqueIdentifiers: $uniqueIdentifiers, channel : $channel){
      id
      name
    }
  }`;

  test('test case add pull job tests with correct data', async () => {
    const variables = {
      name: faker.random.alpha(10),
      status: status.active,
      apiConfiguration: apiConfiguration._id,
      url: faker.internet.url(),
      path: faker.system.directoryPath(),
      schedule: '0 12 5 7 *',
      mapping: faker.datatype.json(),
      uniqueIdentifiers: faker.random.alpha(10),
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

  test('test case with wrong name and return error', async () => {
    const variables = {
      name: faker.science.unit(),
      status: status.active,
      apiConfiguration: apiConfiguration._id,
      url: faker.internet.url(),
      path: faker.system.directoryPath(),
      schedule: '0 12 5 7 *',
      mapping: faker.datatype.json(),
      uniqueIdentifiers: faker.random.alpha(10),
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });

  test('test case without name and return error', async () => {
    const variables = {
      status: status.active,
      apiConfiguration: apiConfiguration._id,
      url: faker.internet.url(),
      path: faker.system.directoryPath(),
      schedule: '0 12 5 7 *',
      mapping: faker.datatype.json(),
      uniqueIdentifiers: faker.random.alpha(10),
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });
});
