import { startDatabase, stopDatabase } from '../src/server/database';
import { initDatabase } from '../src/setup/init';
import schema from '../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from './server.setup';
import { acquireToken } from './authentication.setup';
import errors from '../src/const/errors';
import * as dotenv from 'dotenv';
import { Client, Role } from '../src/models';
dotenv.config();

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let client: Client;

// Execute before all tests.
beforeAll(async () => {
  await startDatabase();
  if (process.env.CI) {
    await initDatabase();
    const newClient = new Client({
      clientId: process.env.clientID,
      name: 'Test user',
    });
    client = await newClient.save();
  }
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

// Execute after all tests.
afterAll(async () => {
  await stopDatabase();
});

describe('End-to-end tests', () => {
  test('query that does not exist returns 400', async () => {
    const response = await request
      .post('/graphql')
      .send({
        query: '{ dummy { id, name } }',
      })
      .set('Accept', 'application/json');
  
    expect(response.status).toBe(400);
  });

  const query = '{ applications { edges { node { id } } } }';
  test('query without auth token returns error', async () => {
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: errors.userNotLogged,
        }),
      ]),
    );
  });

  test('query with auth token and without roles returns error', async () => {
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: errors.permissionNotGranted,
        }),
      ]),
    );
  });

  test('query with auth token and admin role returns success', async () => {
    const admin = await Role.findOne({ title: 'admin' });
    await Client.findOneAndUpdate({ clientId: process.env.clientID }, { roles: [ admin._id ] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: errors.permissionNotGranted,
        }),
      ]),
    );
  });

});

export {
  server,
  request,
  client,
};
