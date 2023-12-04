import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User } from '@models';

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
 * Test Add Dashboard Mutation.
 */
describe('Add dashboard tests cases', () => {
  const query = `mutation addDashboard($name: String!) {
    addDashboard(name: $name){
      id
      name
    }
  }`;

  test('test case add dashboard tests with correct data', async () => {
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
    expect(response.body.data.addDashboard).toHaveProperty('id');
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

  test('test case with insufficient permissions', async () => {
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
    expect(response.body.errors[0].message).toContain('permission');
  });

  test('test case with duplicate name', async () => {
    const variables = {
      name: faker.random.alpha(10),
    };

    // add first panel
    await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    // trying to add second panel with same name
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('unique constraint');
  });

  test('test case with invalid arguments', async () => {
    const variables = {
      name: '', // not valid name
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('invalidArguments');
  });
});
