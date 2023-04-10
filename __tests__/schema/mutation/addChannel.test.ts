import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Application, Role, User } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { status } from '@const/enumTypes';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let application;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Application
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();
});

/**
 * Test Add Channel Mutation.
 */
describe('Add channel mutation tests cases', () => {
  const query = `mutation addChannel($title: String!, $application:ID!) {
    addChannel(title: $title, application:$application ){
      id
      title
    }
  }`;

  test('test case add channel tests with correct data', async () => {
    const variables = {
      title: faker.random.alpha(10),
      application: application._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    } else {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      expect(response.body.data.addChannel).toHaveProperty('id');
    }
  }, 5000);

  test('test case with wrong title and return error', async () => {
    const variables = {
      title: faker.science.unit(),
      application: application._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    }
  }, 5000);

  test('test case without title and return error', async () => {
    const variables = {
      application: application._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    }
  }, 5000);
});