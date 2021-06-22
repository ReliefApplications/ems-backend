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

const queries = [
    '{ apiConfiguration(id: 0) { id } }',
    '{ apiConfigurations { id } }',
    '{ application(id: 0) { id } }',
    '{ applications { id } }',
    '{ channels { id } }',
    '{ dashboard(id: 0) { id } }',
    '{ dashboards { id } }',
    '{ form(id: 0) { id } }',
    '{ forms { id } }',
    '{ me { id } }',
    '{ notifications { id } }',
    '{ page(id: 0) { id } }',
    '{ pages { id } }',
    '{ permissions { id } }',
    '{ record(id: 0) { id } }',
    '{ records { id } }',
    '{ recordsAggregation(pipeline: {}) { id } }',
    '{ resource(id: 0) { id } }',
    '{ resources { id } }',
    '{ roles { id } }',
    '{ step(id: 0) { id } }',
    '{ steps { id } }',
    '{ users { id } }',
    '{ workflow(id: 0) { id } }',
    '{ workflows { id } }',
    '{ positionAttributes(category: 0) { id } }'
];

describe('missing auth token', () => {
    test.each(queries)(
        '%p query returns error',
        async (query) => {
            const response = await request
                .post('/graphql')
                .send({ query })
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
        }
    );
});
