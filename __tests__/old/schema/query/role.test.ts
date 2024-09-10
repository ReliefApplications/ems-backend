import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Application, Channel, Role } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { status } from '@const/enumTypes';

let server: SafeTestServer;
let role;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  const application = await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();
  const channelsInput = [];
  for (let i = 0; i < 10; i++) {
    channelsInput.push({
      title: faker.internet.userName(),
    });
  }
  const channelList: any = await Channel.insertMany(channelsInput);
  const channels = channelList.map((channel) => {
    return channel._id;
  });

  const inputData = {
    title: faker.random.alpha(10),
    description: faker.commerce.productDescription(),
    application: application._id,
    channels: channels,
  };

  role = await new Role(inputData).save();
});
afterAll(async () => {
  await Role.deleteOne({ _id: role._id });
});

/**
 * Test Role query.
 */
describe('Role query tests', () => {
  const query =
    'query getRole($id: ID!) {\
      role(id: $id) { id, title }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: role._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.role).toBeNull();
  });

  test('query with admin user returns expected role', async () => {
    const variables = {
      id: role._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.role).toHaveProperty('id');
  });
});
