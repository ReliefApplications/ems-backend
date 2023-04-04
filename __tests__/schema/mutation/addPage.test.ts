import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Application, Role, User, Resource, Form } from '@models';
import { status, contentType } from '@const/enumTypes';

let server: SafeTestServer;
let application;
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
  const formName = faker.random.alpha(10);
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //create Resource
  const resource = await new Resource({
    name: formName,
  }).save();

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
 * Test Add Page Mutation.
 */
describe('Add page tests cases', () => {
  const query = `mutation addPage($type: ContentEnumType!, $content: ID, $application: ID!) {
    addPage(type: $type, content: $content, application: $application){
      id
      name
      type
    }
  }`;

  test('test case add page tests with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const variables = {
        type: contentType.form,
        content: form._id,
        application: application._id,
      };

      const response = await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      expect(response.body.data.addPage).toHaveProperty('id');
    }
  });

  // test('test case with wrong type and return error', async () => {
  //   const variables = {
  //     type: faker.science.unit(),
  //     application: application._id,
  //   };

  //   expect(async () => {
  //     await request
  //       .post('/graphql')
  //       .send({ query, variables })
  //       .set('Authorization', token)
  //       .set('Accept', 'application/json');
  //   }).rejects.toThrow(TypeError);
  // });

  // test('test case without type and return error', async () => {
  //   const variables = {
  //     application: application._id,
  //   };

  //   expect(async () => {
  //     await request
  //       .post('/graphql')
  //       .send({ query, variables })
  //       .set('Authorization', token)
  //       .set('Accept', 'application/json');
  //   }).rejects.toThrow(TypeError);
  // });
});
