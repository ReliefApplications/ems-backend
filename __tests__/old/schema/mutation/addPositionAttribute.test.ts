import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Application, PositionAttributeCategory, User, Role } from '@models';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let positionAttributeCategory;
let user;
let positionAttribute;
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
  const application = await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();

  //Create Role
  const role = await new Role({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  //Create Position Attribute Category
  positionAttributeCategory = await new PositionAttributeCategory({
    title: faker.random.alpha(10),
    application: application._id,
  }).save();

  positionAttribute = {
    value: positionAttributeCategory.title,
    category: positionAttributeCategory._id,
  };

  //Create User
  const firstName = faker.random.alpha(10);
  const lastName = faker.random.alpha(10);
  user = await new User({
    firstName: firstName,
    lastName: faker.internet.email(),
    username: lastName,
    name: `${firstName} ${lastName}`,
    positionAttributes: positionAttribute,
    role: role._id,
  }).save();
});

/**
 * Test Add Position Attribute Mutation.
 */
describe('Add position attribute mutation tests cases', () => {
  const query = `mutation addPositionAttribute($user: String!,$positionAttribute: PositionAttributeInputType!) {
    addPositionAttribute(user: $user, positionAttribute: $positionAttribute){
      id
      username
    }
  }`;

  test('test case add position attribute tests with correct data', async () => {
    const variables = {
      user: String(user._id),
      positionAttribute: positionAttribute,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addPositionAttribute).toHaveProperty('id');
  });

  test('test case with wrong position attribute value and return error', async () => {
    const variables = {
      user: String(user._id),
      positionAttribute: {
        value: faker.science.unit(),
        category: positionAttributeCategory._id,
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

  test('test case without position attribute and return error', async () => {
    const variables = {
      user: String(user._id),
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
