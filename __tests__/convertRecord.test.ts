import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Form, Resource, Role, User, Record } from '@models';
import { status, contentType } from '@const/enumTypes';

let server: SafeTestServer;
let form;
let record;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

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

  //Create Record
  record = await new Record({
    form: form._id,
    data: {
      [faker.random.alpha(10)]: faker.random.alpha(10),
      [faker.random.alpha(10)]: faker.random.alpha(10),
    },
  }).save();
});

/**
 * Test Add Convert Record Mutation.
 */
describe('Add convert record tests cases', () => {
  const query = `mutation convertRecord($id: ID!, $form: ID!, copyRecord: Boolean!) {
    convertRecord(id: $id, form: $form, copyRecord: $copyRecord){
      id
      incrementalId
      createdAt
    }
  }`;

  test('test case add convert record tests with correct data', async () => {
    const variables = {
      id: record._id,
      form: form._id,
      copyRecord: true,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.convertRecord).toHaveProperty('id');
  });

  test('test case with copy record false and return error', async () => {
    const variables = {
      id: record._id,
      form: form._id,
      copyRecord: false,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.convertRecord).toHaveProperty('id');
  });

  test('test case without copy record and return error', async () => {
    const variables = {
      id: record._id,
      form: form._id,
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
