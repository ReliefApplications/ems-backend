import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Role, User, ReferenceData } from '@models';
import supertest from 'supertest';
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

describe('Add Reference Data Mutation Tests', () => {
  const mutation = `mutation addReferenceData($name: String!) {
    addReferenceData(name: $name) {
      id
      name
      graphQLTypeName
    }
  }`;

  test('Add reference data with correct data', async () => {
    const variables = {
      name: faker.random.word(),
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.addReferenceData).toHaveProperty('id');
    expect(response.body.data.addReferenceData.name).toEqual(variables.name);
  });

  test('Add reference data with empty name and return error', async () => {
    const variables = {
      name: '',
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('invalidArguments');
  });

  test('Add reference data with null name and return error', async () => {
    const variables = {
      name: null,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('invalidArguments');
  });

  test('Add reference data with duplicate name and return error', async () => {
    const existingReferenceData = await ReferenceData.findOne();
    const variables = {
      name: existingReferenceData
        ? existingReferenceData.name
        : faker.random.word(),
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain(
      'duplicatedGraphQLTypeName'
    );
  });
});
