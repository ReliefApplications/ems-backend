import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { ReferenceData } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { referenceDataType } from '@const/enumTypes';

let server: SafeTestServer;
let referenceData;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const referencesData = [];
  for (let j = 0; j < 10; j++) {
    referencesData.push({
      name: faker.address.country(),
      value: faker.address.countryCode(),
    });
  }
  const name = faker.random.alpha(10);
  const inputData = {
    name: name,
    graphQLTypeName: name,
    valueField: 'name',
    query: faker.random.alpha(10),
    type: referenceDataType.graphql,
    data: referencesData,
  };
  referenceData = await new ReferenceData(inputData).save();
});
afterAll(async () => {
  await ReferenceData.deleteOne({ _id: referenceData._id });
});

/**
 * Test ReferenceData query.
 */
describe('ReferenceData query tests', () => {
  const query =
    'query getReferenceData($id: ID!) {\
      referenceData(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: referenceData._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.referenceData).toBeNull();
  });

  test('query with admin user returns expected referenceData', async () => {
    const variables = {
      id: referenceData._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.referenceData).toHaveProperty('id');
  });
});
