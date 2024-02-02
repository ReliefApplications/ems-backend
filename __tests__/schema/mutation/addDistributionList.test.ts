import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Application, Role, User } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let application;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Application
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();
});

/**
 * Test Add Distribution List Mutation.
 */
describe('Add distribution list tests cases', () => {
  const query = `mutation addDistributionList($application: ID!, $distributionList: DistributionListInputType!) {
    addDistributionList(application: $application, distributionList:$distributionList ){
      id
      name
      emails
    }
  }`;

  test('test case add Distribution list tests with correct data', async () => {
    const variables = {
      application: application._id,
      distributionList: {
        name: faker.random.alpha(10),
        emails: faker.internet.email(),
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDistributionList).toHaveProperty('id');
  });

  test('test case with wrong distribution list name and return error', async () => {
    const variables = {
      application: application._id,
      distributionList: {
        name: faker.science.unit(),
        emails: faker.internet.email(),
      },
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

  test('test case without distribution list schedule and return error', async () => {
    const variables = {
      application: application._id,
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

  test('test case with insufficient permissions', async () => {
    await server.removeAdminRoleToUserBeforeTest();
    const nonAdminToken = `Bearer ${await acquireToken()}`;
    const variables = {
      application: application._id,
      distributionList: {
        name: faker.random.alpha(10),
        emails: faker.internet.email(),
      },
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

  test('test case with invalid emails', async () => {
    const variables = {
      application: application._id,
      distributionList: {
        name: faker.random.alpha(10),
        emails: ['email1@example.com', 'invalid-email', 'email3@example.com'],
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Wrong format detected. Please provide valid emails.');
  });
});
