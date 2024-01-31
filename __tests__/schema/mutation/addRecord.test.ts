import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Form, Resource } from '@models';
import { faker } from '@faker-js/faker';
import { ObjectId } from 'bson';

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
 * Test AddRecord Mutation.
 */
describe('AddRecord mutation tests cases', () => {
  const mutation = `
  mutation addRecord($form: ID!, $data: JSON!) {
    addRecord(form: $form, data: $data) {
      id
      createdAt
      modifiedAt
      createdBy {
        id
        name
      }
      form {
        id
        name
      }
    }
  }
  `;

  test('test case add record with correct data', async () => {
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
    const data = {
      country: faker.address.country(),
    };

    const variables = {
      form: form._id,
      data: data,
    };

    const response = await request
      .post('/graphql')
      .send({ query: mutation, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addRecord).toHaveProperty('id');
    expect(response.body.data.addRecord.form).toHaveProperty('id');
    expect(response.body.data.addRecord.form.name).toBe(form.name);
    expect(response.body.data.addRecord.createdBy.id).not.toBeNull();
  });

  test('test case add record with incorrect form ID and return error', async () => {
    const data = {
      country: faker.address.country(),
    };

    const variables = {
      form: new ObjectId().toString(),
      data: data,
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
});
