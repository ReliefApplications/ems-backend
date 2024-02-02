import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Form, Resource, Role, User } from '@models';

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
 * Test Add Form Mutation.
 */
describe('Add form tests cases', () => {
  const query = `mutation addForm($name: String!, $resource: ID, $template: ID) {
    addForm(name: $name, resource: $resource, template:$template ){
      id
      name
      status
      resource {
        id
      }
    }
  }`;

  test('test case add form tests with correct data', async () => {
    const variables = {
      name: faker.random.alpha(10),
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addForm).toHaveProperty('id');
  });

  test('test case with wrong name and return error', async () => {
    const variables = {
      name: faker.science.unit(),
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

  test('test case without name and return error', async () => {
    const variables = {};

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

  test('test case without permission to create forms', async () => {
    await server.removeAdminRoleToUserBeforeTest();
    const nonAdminToken = `Bearer ${await acquireToken()}`;
    const variables = {
      name: faker.random.alpha(10),
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted.');
    await server.restoreAdminRoleToUserAfterTest();
  });

  test('test case with duplicated form name', async () => {
    const existingForm = await Form.findOne(); // Obtenha um formulário existente
    const variables = {
      name: existingForm.name,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain(
      'A form or a reference data with a similar name already exists. Please provide a different name.'
    );
  });

  test('test case create form with specific resource', async () => {
    const newResource = await new Resource({
      name: faker.random.alpha(10),
      
    }).save();

    // create coreForm
    const name = faker.random.alpha(10);
    const graphQLTypeName = Form.getGraphQLTypeName(name);
    await new Form({
      name: faker.random.alpha(10),
      core: true,
      resource: newResource._id.toString(),
      graphQLTypeName: graphQLTypeName
    }).save();

    const variables = {
      name: faker.random.alpha(10),
      resource: newResource._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addForm.resource).toHaveProperty(
      'id',
      newResource._id.toString()
    );
  });
});
