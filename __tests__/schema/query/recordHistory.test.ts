import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Form, Resource, Record } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let record;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const formName = faker.random.alpha(10);

  //create Resource
  const resource = await new Resource({
    name: formName,
  }).save();

  //create Form
  const form = await new Form({
    name: formName,
    graphQLTypeName: formName,
    resource: resource._id,
  }).save();

  const records = [];
  for (let j = 0; j < 10; j++) {
    records.push({
      field_1: faker.vehicle.vehicle(),
      field_2: [faker.word.adjective(), faker.word.adjective()],
      field_3: faker.word.adjective(),
    });
  }

  const inputData = {
    incrementalId:
      new Date().getFullYear() +
      '-D0000000' +
      faker.datatype.number({ min: 1000000 }),
    form: form._id,
    resource: resource._id,
    archived: 'false',
    data: records,
  };
  record = await new Record(inputData).save();
});
afterAll(async () => {
  await Record.deleteOne({ _id: record._id });
});

/**
 * Test RecordHistory query.
 */
describe('RecordHistory query tests', () => {
  const query =
    'query getRecordHistory($id: ID!) {\
      recordHistory(id: $id) { createdAt }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: record._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    console.log('1 recordHistory ==>> ', response.body.data.recordHistory);
    expect(response.body.data.recordHistory).toBeNull();
  });

  test('query with admin user returns expected recordHistory', async () => {
    const variables = {
      id: record._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    console.log('2 recordHistory ==>> ', response.body.data.recordHistory);
    expect(response.body.data.recordHistory.length).toEqual(1);
  });
});
