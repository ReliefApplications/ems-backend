import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Page } from '@models';
import { faker } from '@faker-js/faker'; // Assuming you have Faker configured

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Add Workflow Mutation Tests', () => {
  const mutation = `mutation addWorkflow($name: String!, $page: ID!) {
    addWorkflow(name: $name, page: $page) {
      id
      name
    }
  }`;
  test('should add a new workflow with valid data', async () => {
    const page = await Page.create({ type: 'workflow' });

    const variables = {
      name: faker.lorem.word(),
      page: page._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({
        query: mutation,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('addWorkflow');
    const addedWorkflow = response.body.data.addWorkflow;
    expect(addedWorkflow).toHaveProperty('id');
    expect(addedWorkflow).toHaveProperty('name', variables.name);
  });

  test('should throw an error for missing name', async () => {
    const page = await Page.create({ type: 'workflow' });

    const variables = {
      page: page._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({
        query: mutation,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    const error = response.body.errors[0];
    expect(error).toHaveProperty('message');
    expect(error.message).toContain(
      'Variable "$name" of required type "String!"'
    );
  });
});
