import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Form, Application, Resource } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let form;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);

  await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  const formName = faker.random.alpha(10);
  const resource = await new Resource({
    name: formName,
  }).save();

  const application = await Application.findOne();

  const choice1 = faker.word.adjective();
  const choice2 = faker.word.adjective();
  const choice3 = faker.word.adjective();

  const inputData = {
    name: formName,
    graphQLTypeName: Form.getGraphQLTypeName(formName),
    status: status.pending,
    resource: resource._id,
    fields: [
      {
        type: 'text',
        name: faker.word.adjective(),
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'checkbox',
        name: faker.word.adjective(),
        isRequired: false,
        readOnly: false,
        isCore: true,
        choices: [
          {
            value: choice1,
            text: choice1,
          },
          {
            value: choice2,
            text: choice2,
          },
          {
            value: choice3,
            text: choice3,
          },
        ],
      },
      {
        type: 'radiogroup',
        name: faker.word.adjective(),
        isRequired: false,
        readOnly: false,
        isCore: true,
        choices: [
          {
            value: choice1,
            text: choice1,
          },
          {
            value: choice2,
            text: choice2,
          },
          {
            value: choice3,
            text: choice3,
          },
        ],
      },
      {
        type: 'users',
        name: faker.word.adjective(),
        isRequired: false,
        readOnly: false,
        isCore: true,
        applications: [application._id],
      },
      {
        type: 'users',
        name: faker.word.adjective(),
        isRequired: false,
        readOnly: false,
        isCore: true,
        applications: [application._id],
      },
    ],
  };

  form = await new Form(inputData).save();
});
afterAll(async () => {
  await Form.deleteOne({ _id: form._id });
});

/**
 * Test Form query.
 */
describe('Form query tests', () => {
  const query =
    'query getForm($id: ID!) {\
      form(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: form._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.form).toBeNull();
  });
});
