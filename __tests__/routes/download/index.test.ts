/* eslint-disable */

import { server, request, token, client } from "../../integration.test";

beforeAll(async () => {
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

            console.log(response);

            expect(response.status).toBe(200);
        });
});