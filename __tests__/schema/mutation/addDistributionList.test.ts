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
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
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

  test('test case add Distribution List tests with correct data', async () => {
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

  test('test case with wrong distribution List name and return error', async () => {
    const variables = {
      application: application._id,
      distributionList: {
        name: faker.science.unit(),
        emails: faker.internet.email(),
      },
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });

  test('test case without distribution List schedule and return error', async () => {
    const variables = {
      application: application._id,
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });
});
