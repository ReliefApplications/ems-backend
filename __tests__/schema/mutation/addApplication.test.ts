import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User } from '@models';
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
 * Test AddApplication Mutation.
 */
describe('AddApplication mutation tests cases', () => {
  const mutation = `mutation addApplication {
      addApplication {
        id
        name,
      }
  }`;

  test('test case add application with correct data', async () => {
    const variables = {
      name: faker.random.words(),
    };
    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
  });

  test('test case without authorization and return error', async () => {
    const invalidToken = `Bearer ${await acquireToken()}invalid`;
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', invalidToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('You must be connected');
  });

  test('test case without authentication token and return error', async () => {
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('You must be connected.');
  });

  test('test case with insufficient permissions and return error', async () => {
    await server.removeAdminRoleToUserBeforeTest();

    const tokenWithoutPermission = `Bearer ${await acquireToken()}`;

    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', tokenWithoutPermission)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted');

    await server.restoreAdminRoleToUserAfterTest();
  });

  test('test case with a valid application name', async () => {
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
    expect(response.body.data.addApplication.name).toContain(
      'Untitled application'
    );
  });
});
