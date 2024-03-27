import schema from '../../../src/schema';
import { acquireToken } from '../../authentication.setup';
import { SafeTestServer } from '../../server.setup';
import { ApiConfiguration, Role, User } from '@models';
import supertest from 'supertest';

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
 * Test ApiConfigurations query.
 */
describe('ApiConfigurations query tests', () => {
  const query = '{ apiConfigurations { totalCount, edges { node { id } } } }';

  test('query with admin user returns expected number of apiConfigurations', async () => {
    const count = await ApiConfiguration.countDocuments();
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
    expect(response.body).toHaveProperty([
      'data',
      'apiConfigurations',
      'totalCount',
    ]);
    expect(response.body.data.apiConfigurations.totalCount).toEqual(count);
  });
});
