import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { faker } from '@faker-js/faker';
import { ObjectId } from 'bson';
import { Application, Role } from '@models';

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
      title: faker.name.jobTitle(),
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
  });

  test('Add role with valid application', async () => {
    // find an application in the database
    const application = await Application.findOne();
    const variables = {
      title: faker.name.jobTitle(),
      application: application._id,
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
    expect(response.body.data.addRole.application.id).toEqual(application.id);
  });

  test('Attempt to add role with invalid application', async () => {
    // Assuming you have an invalid application ID
    const variables = {
      title: faker.name.jobTitle(),
      application: new ObjectId().toString(),
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

  test('Attempt to add role with an existing title', async () => {
    // Create a role with the same title first
    const existingRole = new Role({ title: faker.name.jobTitle() });
    await existingRole.save();
    const variables = {
      title: existingRole.title,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Internal Server Error');
  });
});
