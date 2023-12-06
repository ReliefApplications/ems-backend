import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Resource } from '@models';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Delete Aggregation Mutation Tests', () => {
  test('should delete an aggregation successfully', async () => {
    const resource = await Resource.create({ name: 'Test Resource' });
    const aggregation = {
      name: faker.lorem.word(),
      id: new mongoose.Types.ObjectId(),
    };

    resource.aggregations.push(aggregation);
    await resource.save();

    const variables = {
      id: aggregation.id.toString(),
      resource: resource._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({
        query: `
          mutation deleteAggregation(
            $id: ID!,
            $resource: ID!
          ) {
            deleteAggregation(
              id: $id,
              resource: $resource
            ) {
              _id
              name
              // Include other fields you want to verify
            }
          }
        `,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('deleteAggregation');
    const deletedAggregation = response.body.data.deleteAggregation;
    expect(deletedAggregation).toEqual({
      _id: aggregation.id.toString(),
      name: aggregation.name,
    });

    const updatedResource = await Resource.findById(resource._id);
    expect(updatedResource.aggregations).toHaveLength(0);
  });

  test('should throw an error for missing resource ID', async () => {
    const variables = {
      id: 'invalidID',
    };

    const response = await request
      .post('/graphql')
      .send({
        query: `
          mutation deleteAggregation(
            $id: ID!,
            $resource: ID
          ) {
            deleteAggregation(
              id: $id,
              resource: $resource
            ) {
              _id
              name
            }
          }
        `,
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
      'Variable "$resource" of required type "ID!"'
    );
  });
});
