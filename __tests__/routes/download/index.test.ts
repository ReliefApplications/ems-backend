/* eslint-disable */

import schema from '../../../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Client, Resource, Form, Record, Role } from '../../../src/models';
import {getNextId} from '../../../src/utils/form';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;
let client: Client;

let testResourceId: number;

beforeAll(async () => {
    server = new SafeTestServer();
    await server.start(schema);
    request = supertest(server.app);
    token = `Bearer ${await acquireToken()}`;
    client = await Client.findOne({ clientId: process.env.clientID });

    // Creates a resource and a form with a few records
    const newResource = new Resource({
        name: 'AutomatedTestResource',
        fields: [
            {
                "type": "text",
                "name": "test_field_1",
                "isRequired": false,
                "readOnly": false,
                "isCore": true,
                "defaultValue": "This is test field 1"
            },
            {
                "type": "text",
                "name": "test_field_2",
                "isRequired": false,
                "readOnly": false,
                "isCore": true,
                "defaultValue": "This is test field 2"
            }]
    });
    const newResourceRef = await newResource.save();
    testResourceId = newResourceRef._id;
    console.log(testResourceId)

    const newForm = new Form({
        name: 'AutomatedTestForm',
        structure: '',
        resource: newResourceRef._id
    });
    const newFormRef = await newForm.save();

    const newRecord1 = new Record({
        incrementalId: await getNextId(String(testResourceId)),
        form: newFormRef._id,
        resource: newResourceRef._id,
        data: {
            "test_field_1": "Test field 1 data",
            "test_field_2": "Test field 2 data"
        }
    });
    const newRecord1Ref = await newRecord1.save();
});

describe('Test export', () => {

    test('resource creation', async () => {

        const admin = await Role.findOne({ title: 'admin' });
        await Client.findByIdAndUpdate(client.id, { roles: [admin._id] });

        const testResource = await Resource.findById(testResourceId);
        expect(testResource.name).toBe("AutomatedTestResource");

    });

    /*
    test('query', async () => {

        const formName = 'Automated test'
        const query = 'mutation addForm($name: String!, $newResource: Boolean, $resource: ID, $template: ID) {\
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
            .send({ query, variables })
            .set('Authorization', token)
            .set('Accept', 'application/json');
        expect(200).toBe(200);

        await Form.findOneAndDelete({ name: formName });
    });
    */
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