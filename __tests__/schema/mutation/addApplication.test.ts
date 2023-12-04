import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application } from '@models';

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
 * Test AddApplication Mutation.
 */
describe('AddApplication mutation tests cases', () => {
  const mutation = `mutation addApplication {
      addApplication {
        id
        name,
        status
        createdBy
      }
  }`;

  test('test case add application with correct data', async () => {
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
  });

  test('test case without authorization and return error', async () => {
    const invalidToken = 'Bearer invalidToken';
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', invalidToken)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Not authorized');
  });

  test('test case without authentication token and return error', async () => {
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain(
      'Authentication token missing'
    );
  });

  test('test case with insufficient permissions and return error', async () => {
    const userWithoutPermission = new User({
      username: 'userwithoutpermission@dummy.com',
      roles: [],
    });
    await userWithoutPermission.save();

    const tokenWithoutPermission = `Bearer ${await acquireToken()}`;

    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', tokenWithoutPermission)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors[0].message).toContain('Permission not granted');
  });

  test('test case with a valid application name', async () => {
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
    expect(response.body.data.addApplication.name).toContain(
      'Untitled application'
    );
  });

  test('test case with an existing application name and increment number', async () => {
    const initialAppName = 'Existing application 0';
    const initialApp = new Application({
      name: initialAppName,
      status: 'pending',
      createdBy: 'dummyUserId',
      permissions: {
        canSee: [],
        canUpdate: [],
        canDelete: [],
      },
    });
    await initialApp.save();

    // Tentar adicionar outra aplicação sem especificar o nome
    const response = await request
      .post('/graphql')
      .send({ query: mutation })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addApplication).toHaveProperty('id');
    expect(response.body.data.addApplication.name).toContain(
      'Existing application'
    );
    expect(response.body.data.addApplication.name).not.toEqual(initialAppName);
  });
});
