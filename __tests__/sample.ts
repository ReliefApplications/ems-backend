import { SafeServer } from '../src/server';
import { startDatabase, stopDatabase } from '../src/server/database';
import supertest from 'supertest';
import schema from '../src/schema';

let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
    await startDatabase();
    const safeServer = new SafeServer(schema);
    request = supertest(safeServer.app);
})

afterAll(async () => {
    await stopDatabase();
});

test('Sample test', () => {
    expect(2).toBe(2);
});

test('query that does not exist', async () => {
    const response = await request
        .post('/graphql')
        .send({
            query: '{ dummy { id, name} }',
        })
        .set('Accept', 'application/json');

    expect(response.status).toBe(400);
});
