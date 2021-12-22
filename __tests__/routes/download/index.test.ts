/* eslint-disable */

import schema from '../../../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Client } from '../../../src/models';


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

describe('download csv export', () => {

    const query = '{"exportOptions":{"records":"all","fields":"all","format":"csv"},"ids":["616ea25e7d17ab00523af8bc"],"filter":{"logic":"and","filters":[{"filters":[],"logic":"and"},{"logic":"and","filters":[]}]},"format":"csv"}';

    test('query returns error',
        async () => {
            const response = await request
                .post('/records')
                .send({ query })
                .set('Authorization', token)
                .set('Accept', 'application/json');

            console.log(response)
            expect(response.status).toBe(200);
        });
});