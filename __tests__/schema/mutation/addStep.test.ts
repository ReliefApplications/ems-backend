import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import {
  Role,
  User,
  Workflow,
  Form,
  Page,
  Application,
  Resource,
} from '@models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let workflow: Workflow;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  workflow = new Workflow({
    name: faker.random.words(),
    steps: [],
  });
  await workflow.save();

  // Create a page to use in the test
  const page = await new Page({
    name: faker.random.alpha(10),
    type: 'dashboard',
    content: workflow._id,
  }).save();

  // Create an application to use in the test
  await new Application({
    name: faker.random.alpha(10),
    status: 'pending',
    pages: [page._id],
  }).save();
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
          canSee {
            id
          }
        }
      }
  }`;

  test('Add a new step of type Dashboard', async () => {
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
    // define default permission lists
    const defaultResourcePermissions = {
      canSeeRecords: [],
      canCreateRecords: [],
      canUpdateRecords: [],
      canDeleteRecords: [],
    };
    const defaultFormPermissions = {
      canSeeRecords: [],
      canCreateRecords: [],
      canUpdateRecords: [],
      canDeleteRecords: [],
    };
    // create resource
    const resource = await new Resource({
      name: faker.random.alpha(10),
      permissions: defaultResourcePermissions,
      fields: [
        {
          type: 'text',
          name: 'country',
          isRequired: false,
          readOnly: false,
          isCore: true,
          permissions: {
            canSee: [],
            canUpdate: [],
          },
        },
      ],
    }).save();
    const formName = faker.random.words();
    const graphQLTypeName = Form.getGraphQLTypeName(formName);
    const form = await new Form({
      name: faker.random.words(),
      graphQLTypeName,
      status: 'active',
      resource,
      core: true,
      permissions: defaultFormPermissions,
      structure: {
        pages: [
          {
            name: 'page1',
            elements: [
              {
                type: 'text',
                name: 'country',
                title: 'Country',
                valueName: 'country',
              },
            ],
          },
        ],
        showQuestionNumbers: 'off',
      },
    }).save();

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
