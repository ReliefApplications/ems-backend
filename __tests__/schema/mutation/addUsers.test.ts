import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, Application } from '@models';
import { faker } from '@faker-js/faker';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Add Users Mutation Tests', () => {
  test('should add new users with valid data', async () => {
    const application = await Application.create({
      name: faker.random.words(),
    });

    const variables = {
      users: [
        {
          email: faker.internet.email(),
          role: (await Role.findOne({}))._id.toString(),
        },
        {
          email: faker.internet.email(),
          role: (await Role.findOne({}))._id.toString(),
        },
      ],
      application: application._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({
        query: `
          mutation addUsers(
            $users: [UserInputType!]!,
            $application: ID
          ) {
            addUsers(
              users: $users,
              application: $application
            ) {
              id
              username
              name
              roles {
                id
                title
              }
              positionAttributes {
                value
                category {
                  id
                  title
                }
              }
              oid
            }
          }
        `,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('addUsers');
    const addedUsers = response.body.data.addUsers;
    expect(addedUsers).toHaveLength(2);
    expect(addedUsers[0]).toHaveProperty('username');
    expect(addedUsers[0].roles).toHaveLength(0);
  });
});
