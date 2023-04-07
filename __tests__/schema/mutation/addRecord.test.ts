import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Resource, Form, Role, User } from '@models';

let server: SafeTestServer;
let form;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let question1;
let question2;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Resource
  const formName = faker.random.alpha(10);
  const resource = await new Resource({
    name: formName,
  }).save();

  //Create Form
  question1 = faker.random.alpha(10);
  question2 = faker.random.alpha(10);

  form = await new Form({
    name: formName,
    graphQLTypeName: formName,
    resource: resource._id,
    fields: [
      {
        type: 'text',
        name: question1,
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'text',
        name: question2,
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
    ],
    core: true,
  }).save();
});

/**
 * Test Add Record Mutation.
 */
describe('Add record tests cases', () => {
  const query = `mutation addRecord($form: ID, $data: JSON!) {
    addRecord(form: $form, data: $data){
      id
      incrementalId
      createdAt
      modifiedAt 
    }
  }`;

  test('test case add record tests with correct data', async () => {
    const variables = {
      form: form._id,
      data: {
        [question1]: faker.random.alpha(10),
        [question2]: faker.random.alpha(10),
      },
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
      expect(response.body.data.addRecord).toHaveProperty('id');
    }
  }, 5000);

  test('test case with wrong form and return error', async () => {
    const variables = {
      form: faker.science.unit(),
      data: {
        [question1]: faker.random.alpha(10),
        [question2]: faker.random.alpha(10),
      },
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

  test('test case without form and return error', async () => {
    const variables = {
      data: {
        [question1]: faker.random.alpha(10),
        [question2]: faker.random.alpha(10),
      },
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
