// import errors from '../../../src/const/errors';
// import { server, request } from '../../jest.setup';

describe('Foo', () => {
  test('foo foo', () => {
    expect(true).toBe(true);
  });
});

// describe('Applications query tests', () => {
//   const query = '{ applications { edges { node { id } } } }';
//   test('query with wrong user returns error', async () => {

//     server.apolloServer.context = () => ({ user: new User})

//     const response = await request
//       .post('/graphql')
//       .send({ query })
//       .set('Accept', 'application/json');

//     expect(response.status).toBe(200);
//     expect(response.body).toHaveProperty('errors');
//     expect(response.body.errors).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           message: errors.userNotLogged,
//         }),
//       ]),
//     );
//   });
//   test('query with admin user', async () => {
//     const response = await request
//       .post('/graphql')
//       .send({ query })
//       .set('Accept', 'application/json');
  
//     expect(response.status).toBe(200);
//     expect(response.body).not.toHaveProperty('errors');
//   });
// });
