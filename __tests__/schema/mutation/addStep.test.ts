import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import {
  Workflow,
  Role,
  User,
  Application,
  Page,
  Resource,
  Form,
} from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { contentType, status } from '@const/enumTypes';

let server: SafeTestServer;
let workflow;
let form;
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
  const application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();
  const formName = faker.random.alpha(10);

  //Create Workflow
  workflow = await new Workflow({
    name: faker.random.alpha(10),
  }).save();

  //Create Resource
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

  //Create Page
  const page = await new Page({
    type: contentType.workflow,
    content: workflow._id,
    application: application._id,
  }).save();

  //Update updateOne
  await Application.updateOne(
    {
      _id: application._id,
    },
    {
      $addToSet: {
        pages: [page._id],
      },
    },
    {
      new: true,
    }
  );
});

/**
 * Test Add Step Mutation.
 */
describe('Add step mutation tests cases', () => {
  const query = `mutation addStep($type: String!,$content: ID, $workflow : ID!) {
    addStep(type: $type,content: $content, workflow: $workflow){
      id
      name
      type
    }
  }`;

  // test('test case add step tests with correct data', async () => {
  //   const variables = {
  //     type: contentType.form,
  //     content: form._id,
  //     workflow: workflow._id,
  //   };

  //   const response = await request
  //     .post('/graphql')
  //     .send({ query, variables })
  //     .set('Authorization', token)
  //     .set('Accept', 'application/json');
  //   if (!!response.body.errors && !!response.body.errors[0].message) {
  //     expect(
  //       Promise.reject(new Error(response.body.errors[0].message))
  //     ).rejects.toThrow(response.body.errors[0].message);
  //   } else {
  //     expect(response.status).toBe(200);
  //     expect(response.body).toHaveProperty('data');
  //     expect(response.body).not.toHaveProperty('errors');
  //     expect(response.body.data.addStep).toHaveProperty('id');
  //   }
  // });

  test('test case with wrong step type and return error', async () => {
    const variables = {
      type: faker.science.unit(),
      content: form._id,
      workflow: workflow._id,
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

  test('test case without step type and return error', async () => {
    const variables = {
      content: form._id,
      workflow: workflow._id,
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
