import errors from '../src/const/errors';
import { token, request } from './jest.setup';
import { Client, Role, Application } from '../src/models';

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
          message: errors.userNotLogged,
        }),
      ]),
    );
  });

  test('query with auth token and without roles returns empty', async () => {
    const appName = 'Automated test';
    await Application.findOneAndDelete({ name: appName });
    const application = await (new Application({
      name: appName,
    })).save();
    const query = 'query getApplications($id: ID!) {\
      application(id: $id) { name, id }\
    }';
    const variables = {
      id: application._id,
    };
    await Client.findOneAndUpdate({ clientId: process.env.clientID }, { roles: [] });
    const response = await request
      .post('/graphql')
      .send({ query, variables })
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
    await Application.findOneAndDelete({ name: appName });
  });

  test('query with auth token and admin role returns success', async () => {
    const appName = 'Automated test';
    await Application.findOneAndDelete({ name: appName });
    const application = await (new Application({
      name: appName,
    })).save();
    const query = 'query getApplications($id: ID!) {\
      application(id: $id) { name, id }\
    }';
    const variables = {
      id: application._id,
    };
    const admin = await Role.findOne({ title: 'admin' });
    await Client.findOneAndUpdate({ clientId: process.env.clientID }, { roles: [ admin._id ] });
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
      }));
    await Application.findOneAndDelete({ name: appName });
  });
});
