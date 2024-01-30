import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Application, Role, User, Resource, Form, Page } from '@models';
import { status, contentType } from '@const/enumTypes';

let server: SafeTestServer;
let application;
let form;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Application
  const formName = faker.random.alpha(10);
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Create Resource
  const resource = await new Resource({
    name: formName,
  }).save();

  //Create Form
  form = await new Form({
    name: formName,
    graphQLTypeName: formName,
    resource: resource._id,
    fields: [
      {
        type: 'text',
        name: faker.random.alpha(10),
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'text',
        name: faker.random.alpha(10),
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
    ],
    core: true,
  }).save();
});

/**
 * Test Add Page Mutation.
 */
describe('Add page tests cases', () => {
  const query = `mutation addPage($type: ContentEnumType!, $content: ID, $application: ID!) {
    addPage(type: $type, content: $content, application: $application){
      id
      name
      type
    }
  }`;

  test('test case add page tests with correct data', async () => {
    const variables = {
      type: contentType.form,
      content: form._id,
      application: application._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addPage).toHaveProperty('id');
  });

  test('test case with wrong type and return error', async () => {
    const variables = {
      type: faker.science.unit(),
      application: application._id,
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

  test('test case without type and return error', async () => {
    const variables = {
      application: application._id,
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
  test('query without permission to add page', async () => {
    // remove admin role
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const nonAdminToken = `Bearer ${await acquireToken()}`;
    const variables = {
      type: contentType.form,
      content: form._id,
      application: application._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
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

  test('test case add page with duplication', async () => {
    const existingPage = await new Page({
      name: faker.random.alpha(10),
      type: contentType.form,
      content: form._id,
      permissions: {
        canSee: [],
        canUpdate: [],
        canDelete: [],
      },
    }).save();

    const variables = {
      type: contentType.form,
      content: form._id,
      application: application._id,
      duplicate: existingPage._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addPage).toHaveProperty('id');
    expect(response.body.data.addPage.name).toEqual(form.name);
  });
});
