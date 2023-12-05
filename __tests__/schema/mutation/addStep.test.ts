import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Workflow, Form } from '@models';

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
 * Test Add Step Mutation.
 */
describe('Add Step Mutation Tests', () => {
  const mutation = `mutation addStep($type: String!, $content: ID, $workflow: ID!) {
      addStep(type: $type, content: $content, workflow: $workflow) {
        id
        name
        type
        content
        permissions {
          canSee
          canUpdate
          canDelete
        }
      }
  }`;

  test('Add a new step of type Dashboard', async () => {
    const workflow = new Workflow({
      name: faker.random.words(),
      steps: [],
      //createdAt: new Date(),
    });
    await workflow.save();

    const variables = {
      type: 'dashboard',
      workflow: workflow._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addStep).toHaveProperty('id');
    expect(response.body.data.addStep.name).toEqual('Dashboard');
    expect(response.body.data.addStep.type).toEqual('dashboard');
    expect(response.body.data.addStep.permissions).toHaveProperty('canSee');
  });

  test('Add a new step of type Form', async () => {
    const form = new Form({
      name: faker.random.words(),
      //createdAt: new Date(),
    });
    await form.save();

    const workflow = new Workflow({
      name: faker.random.words(),
      steps: [
        {
          name: 'Dashboard Step',
          type: 'dashboard',
          content: 'dashboardId',
          permissions: {
            canSee: ['admin'],
            canUpdate: [],
            canDelete: [],
          },
        },
        {
          name: 'Form Step',
          type: 'form',
          content: 'formId',
          permissions: {
            canSee: ['roleId3', 'roleId4'],
            canUpdate: [],
            canDelete: [],
          },
        },
      ],
    });
    await workflow.save();

    const variables = {
      type: 'form',
      content: form._id,
      workflow: workflow._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addStep).toHaveProperty('id');
    expect(response.body.data.addStep.name).toEqual(form.name);
    expect(response.body.data.addStep.type).toEqual('form');
    expect(response.body.data.addStep.permissions).toHaveProperty('canSee');
  });
});
