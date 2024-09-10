import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Group, Application, User } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let user;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const groupsData = [];
  for (let i = 0; i < 10; i++) {
    groupsData.push({
      name: faker.word.adjective(),
    });
  }
  const groupList: any = await Group.insertMany(groupsData);

  const groups = groupList.map((group) => {
    return group._id;
  });

  //create Application
  const application = await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();

  user = await new User({
    username: faker.internet.email(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    name: faker.name.fullName(),
    oid: faker.datatype.uuid(),
    groups: groups,
    favoriteApp: application._id,
  }).save();
});
afterAll(async () => {
  await User.deleteOne({ _id: user._id });
});

/**
 * Test User query.
 */
describe('User query tests', () => {
  const query =
    'query getUser($id: ID!) {\
      user(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: user._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.user).toBeNull();
  });

  test('query with admin user returns expected user', async () => {
    const variables = {
      id: user._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.user).toHaveProperty('id');
  });
});
