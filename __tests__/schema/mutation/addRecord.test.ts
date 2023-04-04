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

  //create Form
  const formName = faker.random.alpha(10);

  //create Resource
  const resource = await new Resource({
    name: formName,
  }).save();

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

  test('test case add Record tests with correct data', async () => {
    for (let i = 0; i < 1; i++) {
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
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      expect(response.body.data.addRecord).toHaveProperty('id');
    }
  });

  // test('test case with wrong form and return error', async () => {
  //   const variables = {
  //     form: faker.science.unit(),
  //     data: {
  //       [question1]: faker.random.alpha(10),
  //       [question2]: faker.random.alpha(10),
  //     },
  //   };

  //   expect(async () => {
  //     await request
  //       .post('/graphql')
  //       .send({ query, variables })
  //       .set('Authorization', token)
  //       .set('Accept', 'application/json');
  //   }).rejects.toThrow(TypeError);
  // });

  // test('test case without form and return error', async () => {
  //   const variables = {
  //     data: {
  //       [question1]: faker.random.alpha(10),
  //       [question2]: faker.random.alpha(10),
  //     },
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
