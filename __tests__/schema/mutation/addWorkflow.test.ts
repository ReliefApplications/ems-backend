import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Page, Role, User, Application } from '@models';
import { status, contentType } from '@const/enumTypes';

let server: SafeTestServer;
let application;
let page;
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

  //Create Page
  page = await new Page({
    type: contentType.workflow,
    application: application._id,
  }).save();
});

/**
 * Test Add Workflow Mutation.
 */
describe('Add workflow tests cases', () => {
  const query = `mutation addWorkflow($name: String, $page: ID!) {
    addWorkflow(name: $name, page: $page){
      id
      name
    }
  }`;

  test('test case add workflow tests with correct data', async () => {
    const variables = {
      name: faker.random.alpha(10),
      page: page._id,
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
      expect(response.body.data.addWorkflow).toHaveProperty('id');
    }
  }, 5000);

  test('test case with wrong Users email and return error', async () => {
    const variables = {
      name: faker.science.unit(),
      page: page._id,
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

  test('test case without page and return error', async () => {
    const variables = {
      name: faker.random.alpha(10),
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
