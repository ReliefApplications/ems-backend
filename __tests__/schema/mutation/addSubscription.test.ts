import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application, Form, Resource, Channel } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let application;
let form;
let channel;
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

  //Create Resource
  const formName = faker.random.alpha(10);
  const resource = await new Resource({
    name: formName,
  }).save();

  //Create Channel
  channel = await new Channel({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Create Form
  form = await new Form({
    name: formName,
    graphQLTypeName: formName,
    resource: resource._id,
    fields: [
      {
        type: 'text',
        name: faker.random.alpha(10),
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'text',
        name: faker.random.alpha(10),
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
    ],
    core: true,
  }).save();
});

/**
 * Test Add Subscription Mutation.
 */
describe('Add subscription tests cases', () => {
  const query = `mutation addSubscription($application: ID!, $title: String!, $convertTo: ID, $channel: ID) {
    addSubscription(application: $application, title: $title, convertTo: $convertTo, channel: $channel){
      title
      routingKey
    }
  }`;

  test('test case add subscription tests with correct data', async () => {
    const variables = {
      application: application._id,
      title: faker.random.alpha(10),
      convertTo: form._id,
      channel: channel._id,
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
      expect(response.body.data.addSubscription).toHaveProperty('title');
    }
  });

  test('test case with wrong title and return error', async () => {
    const variables = {
      application: application._id,
      title: faker.science.unit(),
      convertTo: form._id,
      channel: channel._id,
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
  });

  test('test case without application and return error', async () => {
    const variables = {
      title: faker.random.alpha(10),
      convertTo: form._id,
      channel: channel._id,
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
  });
});
