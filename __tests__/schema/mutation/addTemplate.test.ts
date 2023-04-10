import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let application;
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
  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();
});

/**
 * Test Add Template Mutation.
 */
describe('Add template tests cases', () => {
  const query = `mutation addTemplate($application: ID!, $template: TemplateInputType!) {
    addTemplate(application: $application, template: $template){
      id
      name
      type
    }
  }`;

  test('test case add template tests with correct data', async () => {
    const variables = {
      application: application._id,
      template: {
        name: faker.random.alpha(10),
        type: faker.random.alpha(10),
        content: faker.datatype.json(),
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
    } else {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      expect(response.body.data.addTemplate).toHaveProperty('id');
    }
  }, 5000);

  test('test case with wrong template name and return error', async () => {
    const variables = {
      application: application._id,
      template: {
        name: faker.science.unit(),
        type: faker.random.alpha(10),
        content: faker.datatype.json(),
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
  }, 5000);

  test('test case without template and return error', async () => {
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
  }, 5000);
});
