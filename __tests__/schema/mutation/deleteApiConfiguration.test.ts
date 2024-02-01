import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { ApiConfiguration } from '@models';
import { faker } from '@faker-js/faker';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Delete ApiConfiguration Mutation Tests', () => {
  const mutation = `mutation deleteApiConfiguration($id: ID!) {
    deleteApiConfiguration(id: $id) {
      id
    }
  }`;

  test('should delete an apiConfiguration successfully', async () => {
    const apiConfiguration = await new ApiConfiguration({
      name: faker.lorem.word(),
    }).save();

    const variables = {
      id: apiConfiguration.id.toString(),
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
    expect(response.body.data).toHaveProperty('deleteApiConfiguration');
    const deletedAggregation = response.body.data.deleteApiConfiguration;
    expect(deletedAggregation).toEqual({
      id: apiConfiguration.id.toString(),
    });
  });

  test('should throw an error for missing apiConfiguration', async () => {
    const variables = {};

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
      'Variable "$id" of required type "ID!" was not provided.'
    );
  });
});
