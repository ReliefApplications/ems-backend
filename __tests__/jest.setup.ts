import { startDatabase, stopDatabase } from '../src/server/database';
import schema from '../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from './server.setup';

let server: any;
let request: any;

// Execute before all tests.
beforeAll(async () => {
    await startDatabase();
    server = new SafeTestServer(schema);
    request = supertest(server.app);
});

// Execute after all tests.
afterAll(async () => {
    await stopDatabase();
});

test('query that does not exist', async () => {
    const response = await request
        .post('/graphql')
        .send({
            query: '{ dummy { id, name } }',
        })
        .set('Accept', 'application/json');

    expect(response.status).toBe(400);
});

export {
    server,
    request
};
