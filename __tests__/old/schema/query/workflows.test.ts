import { Workflow, Role, User } from '@models';

import supertest from 'supertest';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Workflows query.
 */
describe('Workflows query tests', () => {
  const query = '{ workflows { id, name } }';

  test('query without access returns empty list', async () => {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty(['data', 'workflows']);
    expect(response.body.data.workflows.length).toEqual(0);
  });

  test('query with wrong user returns error', async () => {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
  });

  test('query with admin user returns expected number of workflows', async () => {
    const count = await Workflow.countDocuments();
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty(['data', 'workflows']);
    expect(response.body.data.workflows.length).toEqual(count);
  });
});
