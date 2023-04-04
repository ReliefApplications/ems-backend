import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User } from '@models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Add ApiConfiguration Mutation.
 */
describe('Add api configuration mutation tests cases', () => {
  const query = `mutation addApiConfiguration($name: String!) {
      addApiConfiguration(name: $name){
          id
          name,
          status,
          authType
      }
  }`;

  test('test case add ApiConfiguration tests with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const variables = {
        name: faker.random.alpha(10),
      };

      const response = await request
        .post('/graphql')
        .send({ query, variables })
        .set('Authorization', token)
        .set('Accept', 'application/json');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).not.toHaveProperty('errors');
      expect(response.body.data.addApiConfiguration).toHaveProperty('id');
    }
  });

  // test('test case with wrong name and return error', async () => {
  //   const variables = {
  //     name: faker.science.unit(),
  //   };

  //   expect(async () => {
  //     await request
  //       .post('/graphql')
  //       .send({ query, variables })
  //       .set('Authorization', token)
  //       .set('Accept', 'application/json');
  //   }).rejects.toThrow(TypeError);
  // });

  // test('test case without name and return error', async () => {
  //   const variables = {};

  //   expect(async () => {
  //     await request
  //       .post('/graphql')
  //       .send({ query, variables })
  //       .set('Authorization', token)
  //       .set('Accept', 'application/json');
  //   }).rejects.toThrow(TypeError);
  // });
});
