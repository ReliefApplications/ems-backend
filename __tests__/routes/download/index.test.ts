/* eslint-disable */

import schema from '../../../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Client, Resource, Form, Record, Role } from '../../../src/models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let client: Client;

beforeAll(async () => {
    server = new SafeTestServer();
    await server.start(schema);
    request = supertest(server.app);
    token = `Bearer ${await acquireToken()}`;
    client = await Client.findOne({ clientId: process.env.clientID });




});

describe('add new form', () => {


    test('query', async () => {
        const query = 'query addForm($id: ID!) {\
        application(id: $id) { name, id }\
      }';

        const formName = 'Automated test'
        const mutation = 'mutation addForm($name: String!, $newResource: Boolean, $resource: ID, $template: ID) {\
        addForm(name: $name, newResource: $newResource, resource: $resource, template: $template) {\
          id\
          name\
          createdAt\
          status\
          versions {\
            id\
          }\
        }\
       }';
        const variables = {
            name: formName,
            newResource: true,
        };

        // Set client's role as admin
        const admin = await Role.findOne({ title: 'admin' });
        await Client.findByIdAndUpdate(client.id, { roles: [admin._id] });

        const response = await request
            .post('/graphql')
            .send({ mutation, variables })
            .set('Authorization', token)
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);

        /*
        expect(response.body).not.toHaveProperty('errors');
        expect(response.body).toHaveProperty(['data', 'application']);
        expect(response.body.data.application).toEqual(
            expect.objectContaining({
                id: String(application._id),
                name: application.name,
            }));
            await Application.findOneAndDelete({ name: formName });
            */

        await Form.findOneAndDelete({ name: formName });
    });
});

/*
describe('download csv export', () => {

    const query = '{"exportOptions":{"records":"all","fields":"all","format":"csv"},"ids":["616ea25e7d17ab00523af8bc"],"filter":{"logic":"and","filters":[{"filters":[],"logic":"and"},{"logic":"and","filters":[]}]},"format":"csv"}';

    test('query returns error',
        async () => {
            const response = await request
                .post('/download/records')
                .send({ query })
                .set('Authorization', token)
                .set('Accept', 'application/json');

            console.log(response);

            expect(response.status).toBe(200);
        });
});
*/