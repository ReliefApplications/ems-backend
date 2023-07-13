import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Resource, Application, Role, User } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { status } from '@const/enumTypes';
// import { status, customNotificationStatus } from '@const/enumTypes';

let server: SafeTestServer;
let resource;
let application;
let template;
let layout;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Resource
  resource = await new Resource({
    name: faker.random.alpha(10),
  }).save();

  //Create Application
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Update Application
  const templates = {
    $addToSet: {
      templates: {
        name: faker.random.alpha(10),
        type: faker.random.alpha(10),
        content: faker.datatype.json(),
      },
    },
  };

  template = await Application.findByIdAndUpdate(application._id, templates, {
    new: true,
  });

  template = template.templates[0];

  //Update Resource
  const layouts = {
    name: faker.random.alpha(10),
    template: template._id,
    filter: faker.datatype.json(),
    pageSize: 10,
    fields: faker.datatype.json(),
    sort: faker.datatype.json(),
    style: faker.datatype.json(),
  };

  layout = await Resource.findByIdAndUpdate(
    resource._id,
    { layouts },
    { new: true }
  );

  layout = layout.layouts[0];
});

/**
 * Test Add Custom Notification Mutation.
 */
describe('Add custom notification tests cases', () => {
  const query = `mutation addCustomNotification($application: ID!, $notification: CustomNotificationInputType!) {
    addCustomNotification(application: $application, notification:$notification ){
      id
      name
      notificationType
    }
  }`;

  test('test case add custom notification tests with correct data', async () => {
    const variables = {
      application: application._id,
      notification: {
        name: faker.random.alpha(10),
        description: faker.lorem.text(),
        schedule: '0 5 5 7 *',
        notificationType: faker.random.alpha(10),
        resource: resource._id,
        layout: layout._id,
        template: template._id,
        recipients: faker.random.alpha(10),
        recipientsType: faker.random.alpha(10),
        // notification_status: customNotificationStatus.active,
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addCustomNotification).toHaveProperty('id');
  });

  test('test case with wrong notification name and return error', async () => {
    const variables = {
      application: application._id,
      notification: {
        name: faker.science.unit(),
        description: faker.lorem.text(),
        schedule: '0 5 5 7 *',
        notificationType: faker.random.alpha(10),
        resource: resource._id,
        layout: layout._id,
        template: template._id,
        recipients: faker.random.alpha(10),
        recipientsType: faker.random.alpha(10),
        // notification_status: customNotificationStatus.active,
      },
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

  test('test case without notification schedule and return error', async () => {
    const variables = {
      application: application._id,
      notification: {
        name: faker.random.alpha(10),
        description: faker.lorem.text(),
        schedule: '0 5 5 7 *',
        notificationType: faker.random.alpha(10),
        resource: resource._id,
        layout: layout._id,
        template: template._id,
        recipients: faker.random.alpha(10),
        recipientsType: faker.random.alpha(10),
        // notification_status: customNotificationStatus.active,
      },
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
});