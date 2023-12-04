import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Form } from '@models';
import { faker } from '@faker-js/faker';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test AddRecord Mutation.
 */
describe('AddRecord mutation tests cases', () => {
  const mutation = `
    mutation addRecord($form: ID!, $data: JSON!) {
      addRecord(form: $form, data: $data) {
        id
        incrementalId
        form {
          id
          name
        }
        createdBy {
          user {
            id
            name
          }
        }
      }
    }
  `;

  test('test case add record with correct data', async () => {
    const form = await Form.findOne(); // Get a form from the database
    const data = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      age: faker.datatype.number({ min: 18, max: 99 }),
      email: faker.internet.email(),
      isSubscribed: faker.datatype.boolean(),
    };

    const variables = {
      form: form._id,
      data: data,
    };

    const response = await request
      .post('/graphql')
      .send({ mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addRecord).toHaveProperty('id');
    expect(response.body.data.addRecord.form).toHaveProperty('id');
    expect(response.body.data.addRecord.form.name).toBe(form.name);
    expect(response.body.data.addRecord.createdBy.user.id).not.toBeNull();
  });

  test('test case add record with incorrect form ID and return error', async () => {
    const data = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      age: faker.datatype.number({ min: 18, max: 99 }),
      email: faker.internet.email(),
      isSubscribed: faker.datatype.boolean(),
    };

    const variables = {
      form: 'invalid-form-id',
      data: data,
    };

    const response = await request
      .post('/graphql')
      .send({ mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Form not found');
  });
});
