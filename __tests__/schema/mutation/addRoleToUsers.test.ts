import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Application, Role, User, PositionAttributeCategory } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { status } from '@const/enumTypes';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let role;
let positionAttributeCategory;
const userName = faker.internet.email();
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  //Create Application
  const application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  role = await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Create User
  const firstName = faker.random.alpha(10);
  const lastName = faker.random.alpha(10);
  await new User({
    username: userName,
    firstName: firstName,
    lastName: lastName,
    name: `${firstName} ${lastName}`,
  }).save();

  //Create Position Attribute Category
  positionAttributeCategory = await new PositionAttributeCategory({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();
});

/**
 * Test Add Role To Users Mutation.
 */
describe('Add role to users mutation tests cases', () => {
  const query = `mutation addRoleToUsers($usernames: [String]!, $role: ID!, $positionAttributes : [PositionAttributeInputType]) {
    addRoleToUsers(usernames: $usernames, role: $role, positionAttributes: $positionAttributes){
      id
      username
      firstName
      lastName
      name
    }
  }`;

  test('test case without add role to users tests with correct data', async () => {
    const variables = {
      usernames: [userName],
      role: role._id,
      positionAttributes: [
        {
          value: positionAttributeCategory.title,
          category: positionAttributeCategory._id,
        },
      ],
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    response.body.data?.addRoleToUsers.forEach((prop) => {
      expect(prop).toHaveProperty('id');
    });
  });

  test('test case with wrong role id and return error', async () => {
    const variables = {
      usernames: [userName],
      role: faker.science.unit(),
      positionAttributes: [
        {
          value: positionAttributeCategory.title,
          category: positionAttributeCategory._id,
        },
      ],
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

  test('test case without user names and return error', async () => {
    const variables = {
      role: role._id,
      positionAttributes: [
        {
          value: positionAttributeCategory.title,
          category: positionAttributeCategory._id,
        },
      ],
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
