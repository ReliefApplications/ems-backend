import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Form } from '@models';

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
 * Test Add Draft Record Mutation.
 */
describe('Add draft record tests cases', () => {
  const mutation = `mutation addDraftRecord($form: ID!, $data: JSON!) {
    addDraftRecord(form: $form, data: $data) {
      _id
      data
      form {
        _id
        name
      }
      createdBy {
        user {
          _id
          name
          username
        }
        roles {
          _id
        }
        positionAttributes {
          value
          category {
            _id
          }
        }
      }
      lastUpdateForm {
        _id
        name
      }
    }
  }`;

  test('test case add draft record tests with correct data', async () => {
    // Create a form to use in the test
    const form = await new Form({
      name: faker.random.alpha(10),
      fields: [],
    }).save();

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
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDraftRecord).toHaveProperty('_id');
    expect(response.body.data.addDraftRecord.form._id).toBe(
      form._id.toString()
    );
  });

  test('test case add draft record with invalid form ID', async () => {
    const variables = {
      form: 'invalid-form-id',
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
    expect(response.body.errors[0].message).toContain('dataNotFound');
  });

  test('test case add draft record with insufficient permissions', async () => {
    const form = await new Form({
      name: faker.random.alpha(10),
      fields: [],
    }).save();

    // Create a non-admin user without permissions
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
    expect(response.body.errors[0].message).toContain('permissionNotGranted');
  });
});
