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
 * Test Add Reference Data Mutation.
 */
describe('Add reference data tests cases', () => {
  const query = `mutation addReferenceData($name: String!) {
    addReferenceData(name: $name){
      id
      name
    }
  }`;

  test('test case add Reference Data tests with correct data', async () => {
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
    expect(response.body.data.addReferenceData).toHaveProperty('id');
  });

  test('test case with wrong name and return error', async () => {
    const variables = {
      name: faker.science.unit(),
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });

  test('test case without name and return error', async () => {
    const variables = {};

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });
});
