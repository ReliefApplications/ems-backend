import { startDatabase, stopDatabase } from '../src/server/database';
import schema from '../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from './server.setup';
import { acquireToken } from './authentication.setup';
import * as dotenv from 'dotenv';
import { Client } from '../src/models';
dotenv.config();

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let client: Client;

// Execute before each file.
beforeAll(async () => {
  await startDatabase();
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
  client = await Client.findOne({ clientId: process.env.clientID });
}, 15000);

afterAll(async () => {
  await stopDatabase();
});

export {
  server,
  request,
  client,
  token,
};
