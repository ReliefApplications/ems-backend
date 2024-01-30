import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Page, Dashboard, Record, Form, Resource, Role, User } from '@models';
import { ObjectId } from 'bson';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Add Dashboard with Context Mutation.
 */
describe('Add dashboard with context tests cases', () => {
  const mutation = `mutation addDashboardWithContext($page: ID!, $element: JSON, $record: ID) {
    addDashboardWithContext(page: $page, element: $element, record: $record) {
      id
    }
  }`;

  test('test case add dashboard with context tests with correct data', async () => {
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

    // create form
    const graphQLTypeName = Form.getGraphQLTypeName(resource.name);
    const form = await new Form({
      name: resource.name,
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

    // create record
    const record = await new Record({
      incrementalId: '2024-C00000001',
      form: form._id,
      data: {
        country: 'Brazil',
      },
      _form: {
        _id: form._id,
        name: form.name,
      },
    }).save();

    // create a template to use in the test
    const template = await new Dashboard({
      name: 'Template Dashboard',
      structure: [],
    }).save();

    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: template._id,
      context: {
        resource: resource._id,
        displayField: 'country',
      },
    }).save();

    const variables = {
      page: page._id,
      record: record._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addDashboardWithContext).toHaveProperty('id');
  });

  test('test case without authorization and return error', async () => {
    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      record: new ObjectId().toString(),
    };

    const invalidToken = `Bearer ${await acquireToken()}invalid`;
    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', invalidToken)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('You must be connected');
  });

  test('test case with insufficient permissions and return error', async () => {
    // remove admin role
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const nonAdminToken = `Bearer ${await acquireToken()}`;

    // Create a page to use in the test
    const page = await new Page({
      name: faker.random.alpha(10),
      type: 'dashboard',
      content: new Dashboard({
        name: 'Template Dashboard',
        structure: [],
      }),
    }).save();

    const variables = {
      page: page._id,
      record: new ObjectId().toString(),
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', nonAdminToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted');
    // restore admin role
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
  });

  test('test case with invalid page ID and return error', async () => {
    // create a random page id
    const invalidPageId = new ObjectId().toString();
    const variables = {
      page: invalidPageId,
      record: new ObjectId().toString(),
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Data not found');
  });

  test('test case with invalid arguments and return error', async () => {
    const variables = {
      page: new ObjectId().toString(),
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain(
      'You need to provide one, and only one, argument between a reference data element and a record.'
    );
  });
});
