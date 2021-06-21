import { SafeServer } from '../src/server';
import { startDatabase, stopDatabase } from '../src/server/database';
import supertest from 'supertest';
import schema from '../src/schema';
import errors from '../src/const/errors';

let request: supertest.SuperTest<supertest.Test>;

// Execute before all tests.
beforeAll(async () => {
    await startDatabase();
    const safeServer = new SafeServer(schema);
    request = supertest(safeServer.app);
})

// Execute after all tests.
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
            query: '{ dummy { id, name } }',
        })
        .set('Accept', 'application/json');

    expect(response.status).toBe(400);
});

test('missing auth token', async () => {
    const response = await request
        .post('/graphql')
        .send({
            query: '{ users { id, username } }',
        })
        .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                message: errors.userNotLogged
            })
        ])
    );
});
