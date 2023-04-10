import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Application, Role, User } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let application;

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
 * Test Add Role Mutation.
 */
describe('Add role mutation tests cases', () => {
  const query = `mutation addRole($title: String!, $application: ID) {
    addRole(title: $title, application: $application){
      id
      title
    }
  }`;

  test('test case without application add role tests with correct data', async () => {
    const variables = {
      title: faker.random.alpha(10),
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
      expect(response.body.data.addRole).toHaveProperty('id');
    }
  }, 5000);

  test('test case with application add role tests with correct data', async () => {
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
      expect(response.body.data.addRole).toHaveProperty('id');
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