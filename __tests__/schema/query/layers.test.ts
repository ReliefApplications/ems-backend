import { Layer, Role, User } from '@models';

import supertest from 'supertest';
import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

/**
 * Test Layers query.
 */
describe('Layers query tests', () => {
  const query = '{ layers { id, name } }';

  test('query with admin user returns expected number of layers', async () => {
    const count = await Layer.countDocuments();
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
    const response = await request
      .post('/graphql')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.body.errors).toBeUndefined();
    expect(response.body).toHaveProperty(['data', 'layers']);
    expect(response.body.data?.layers.length).toEqual(count);
    response.body.data?.layers.forEach((prop) => {
      expect(prop).toHaveProperty('name');
    });
  });
});
