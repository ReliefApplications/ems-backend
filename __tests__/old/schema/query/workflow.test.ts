import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Dashboard, Step, Workflow } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { contentType } from '@const/enumTypes';

let server: SafeTestServer;
let workflow;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const dashboard = await new Dashboard({
    name: faker.word.adjective(),
  }).save();

  const stepsInput = [];
  for (let i = 0; i < 10; i++) {
    stepsInput.push({
      name: faker.random.alpha(10),
      type: contentType.dashboard,
      content: dashboard._id,
    });
  }
  const stepList: any = await Step.insertMany(stepsInput);

  const steps = stepList.map((step) => {
    return step._id;
  });

  workflow = await new Workflow({
    name: faker.random.alpha(10),
    steps: steps,
  }).save();
});
afterAll(async () => {
  await Workflow.deleteOne({ _id: workflow._id });
});

/**
 * Test Workflow query.
 */
describe('Workflow query tests', () => {
  const query =
    'query getWorkflow($id: ID!) {\
      workflow(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: workflow._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.workflow).toBeNull();
  });

  test('query with admin user returns expected workflow', async () => {
    const variables = {
      id: workflow._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.workflow).toHaveProperty('id');
  });
});
