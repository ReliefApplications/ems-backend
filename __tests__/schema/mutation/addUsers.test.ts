import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { PositionAttributeCategory, Role, User, Application } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let application;
let role;
let positionAttributeCategory;
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

  //Create Role
  role = await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Create Position Attribute Category
  positionAttributeCategory = await new PositionAttributeCategory({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();
});

/**
 * Test Add Users Mutation.
 */
describe('Add Users tests cases', () => {
  const query = `mutation addUsers($users: [UserInputType]!, $application: ID) {
    addUsers(users: $users, application: $application){
      id
      username
      name
    }
  }`;

  test('test case add Users tests with correct data', async () => {
    const variables = {
      users: [
        {
          email: faker.internet.email(),
          role: role._id,
          positionAttributes: [
            {
              value: positionAttributeCategory.title,
              category: positionAttributeCategory._id,
            },
          ],
        },
      ],
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
    } else {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      response.body.data?.addUsers.forEach((prop) => {
        expect(prop).toHaveProperty('id');
      });
    }
  });

  test('test case with wrong Users email and return error', async () => {
    const variables = {
      users: [
        {
          email: faker.science.unit(),
          role: role._id,
          positionAttributes: [
            {
              value: positionAttributeCategory.title,
              category: positionAttributeCategory._id,
            },
          ],
        },
      ],
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

  test('test case without users and return error', async () => {
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
});
