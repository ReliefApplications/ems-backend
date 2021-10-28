import { User } from '../../../src/models';
import errors from '../../../src/const/errors';
import { request } from '../../jest.setup';

describe('missing auth token', () => {
    const query = '{ applications { id } }';
    test('query returns error',
        async () => {
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
        });
});

describe('missing role', () => {
    const query = '{ applications { id } }';
    const dummyUser: User = new User({
        username: 'dummy',
        name: 'dummy',
        oid: 'dummy'
    });
    dummyUser.save();
    test('query returns nothing', async () => {
        const response = await request
            .post('/graphql')
            .send(query)
            .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).not.toHaveProperty('errors');
    });
});
