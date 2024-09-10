import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Resource, Role, User } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let resource;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
  const formName = faker.random.alpha(10);

  //Create Resource
  resource = await new Resource({
    name: formName,
  }).save();
});

/**
 * Test Add Aggregation Mutation.
 */
describe('Add aggregation mutation tests cases', () => {
  const query = `mutation addAggregation($resource: ID!, $aggregation: AggregationInputType!) {
    addAggregation(resource: $resource, aggregation:$aggregation ){
      id
      name
    }
  }`;

  test('test case add aggregation tests with correct data', async () => {
    const fieldName = faker.random.alpha(10);
    const variables = {
      resource: resource._id,
      aggregation: {
        name: faker.random.alpha(10),
        sourceFields: [fieldName],
        pipeline: [
          {
            type: 'filter',
            form: {
              logic: 'and',
              filters: [
                {
                  field: fieldName,
                  value: faker.random.alpha(10),
                },
              ],
            },
          },
        ],
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
    expect(response.body.data.addAggregation).toHaveProperty('id');
  });

  test('test case without resource and return error', async () => {
    const fieldName = faker.random.alpha(10);
    const variables = {
      aggregation: {
        name: faker.random.alpha(10),
        sourceFields: [fieldName],
        pipeline: [
          {
            type: 'filter',
            form: {
              logic: 'and',
              filters: [
                {
                  field: fieldName,
                  value: faker.random.alpha(10),
                },
              ],
            },
          },
        ],
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
  test('test case without resource and return error', async () => {
    const variables = {
      resource: resource._id,
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
});
