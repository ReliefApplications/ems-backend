import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Form, FormModel } from '@models';
import { ObjectId } from 'bson';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let form;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  // Create a form to use in the test
  const name = faker.random.alpha(10);
  const graphQLTypeName = Form.getGraphQLTypeName(name);
  form = await new Form({
    name: name,
    graphQLTypeName: graphQLTypeName,
    fields: [],
  }).save();
});

/**
 * Test Add Draft Record Mutation.
 */
describe('Add draft record tests cases', () => {
  const mutation = `mutation addDraftRecord($form: ID!, $data: JSON!) {
    addDraftRecord(form: $form, data: $data) {
      id
      createdAt
      modifiedAt
      createdBy {
        name
      }
      form {
        id
        uniqueRecord {
          id
          modifiedAt
          createdBy {
            name
          }
          data
        }
      }
    }
  }`;

  test('test case add draft record tests with correct data', async () => {
    const variables = {
      form: form._id.toString(),
      data: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: faker.datatype.number({ min: 18, max: 99 }),
        email: faker.internet.email(),
        isSubscribed: faker.datatype.boolean(),
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDraftRecord).toHaveProperty('id');
    expect(response.body.data.addDraftRecord.form.id).toBe(
      form._id.toString()
    );
  });

  test('test case add draft record with invalid form ID', async () => {
    const variables = {
      form: new ObjectId().toString(),
      data: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: faker.datatype.number({ min: 18, max: 99 }),
        email: faker.internet.email(),
        isSubscribed: faker.datatype.boolean(),
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Data not found');
  });

  test('test case add draft record with insufficient permissions', async () => {
    // Create a non-admin user without permissions
    await server.removeAdminRoleToUserBeforeTest();
    const nonAdminToken = `Bearer ${await acquireToken()}`;

    const variables = {
      form: form._id,
      data: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: faker.datatype.number({ min: 18, max: 99 }),
        email: faker.internet.email(),
        isSubscribed: faker.datatype.boolean(),
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted.');
    await server.restoreAdminRoleToUserAfterTest();
  });
});
