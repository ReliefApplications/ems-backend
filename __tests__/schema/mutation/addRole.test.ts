import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role } from '@models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Add Role Mutation Tests', () => {
  const mutation = `mutation addRole($title: String!, $application: ID) {
    addRole(title: $title, application: $application) {
      id
      title
      application {
        id
      }
    }
  }`;

  test('Add role without application', async () => {
    const variables = {
      title: 'TestRole',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addRole.title).toEqual(variables.title);
    expect(response.body.data.addRole.application).toBeNull();
  });

  test('Add role with valid application', async () => {
    // Assuming you have a valid application ID
    const validApplicationId = 'validApplicationId';
    const variables = {
      title: 'TestRole',
      application: validApplicationId,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addRole.title).toEqual(variables.title);
    expect(response.body.data.addRole.application.id).toEqual(
      validApplicationId
    );
  });

  test('Attempt to add role with invalid application', async () => {
    // Assuming you have an invalid application ID
    const invalidApplicationId = 'invalidApplicationId';
    const variables = {
      title: 'TestRole',
      application: invalidApplicationId,
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

  test('Attempt to add role with an existing title', async () => {
    // Create a role with the same title first
    const existingRole = new Role({ title: 'ExistingRole' });
    await existingRole.save();

    const variables = {
      title: 'ExistingRole',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('duplicated');
  });
});
