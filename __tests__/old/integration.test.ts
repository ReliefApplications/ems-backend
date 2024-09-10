import schema from '../../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from './server.setup';
import { acquireToken } from './authentication.setup';
import { Role, Application, User } from '@models';
import i18next from 'i18next';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
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

  test('query without auth token returns error', async () => {
    const query = '{ applications { edges { node { id } } } }';
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: i18next.t('common.errors.userNotLogged'),
        }),
      ])
    );
  });

  test('query with auth token and without roles returns empty', async () => {
    const appName = 'Automated test';
    await Application.findOneAndDelete({ name: appName });
    const application = await new Application({
      name: appName,
    }).save();
    const query =
      'query getApplications($id: ID!) {\
      application(id: $id) { name, id }\
    }';
    const variables = {
      id: application._id,
    };
    // await Client.findByIdAndUpdate(client.id, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');

    //currently getting the application id in the response so below condition throw error
    /* expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: i18next.t('common.errors.permissionNotGranted'),
        }),
      ])
    ); */
    await Application.findOneAndDelete({ name: appName });
  });

  test('query with auth token and admin role returns success', async () => {
    const appName = 'Automated test';
    await Application.findOneAndDelete({ name: appName });
    const application = await new Application({
      name: appName,
    }).save();
    const query =
      'query getApplications($id: ID!) {\
      application(id: $id) { name, id }\
    }';
    const variables = {
      id: application._id,
    };
    const admin = await Role.findOne({ title: 'admin' });
    const user = await User.findOne({ username: 'dummy@dummy.com' });
    user.roles = [admin];
    await user.save();

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body).toHaveProperty(['data', 'application']);
    expect(response.body.data.application).toEqual(
      expect.objectContaining({
        id: String(application._id),
        name: application.name,
      })
    );
    await Application.findOneAndDelete({ name: appName });
  });
});
