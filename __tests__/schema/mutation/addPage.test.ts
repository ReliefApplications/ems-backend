import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Application, Role, User } from '@models';
import { status, contentType } from '@const/enumTypes';

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

  application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();
  await new Role({
    title: faker.random.alpha(10),
    application: application._id,
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
      type: contentType.workflow,
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

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });

  test('test case without type and return error', async () => {
    const variables = {
      application: application._id,
    };

    expect(async () => {
      await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
    }).rejects.toThrow(TypeError);
  });
});
