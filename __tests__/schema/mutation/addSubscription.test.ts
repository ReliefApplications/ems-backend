import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application, Channel, Form } from '@models';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Add Subscription Mutation Tests', () => {
  test('should add a new subscription with valid data', async () => {
    const application = await Application.create({ name: 'Test Application' });
    const channel = await Channel.create({
      name: 'Test Channel',
      application: application._id,
    });
    const form = await Form.create({ name: 'Test Form' });

    const variables = {
      application: application._id.toString(),
      routingKey: 'test.routing.key',
      title: 'Test Subscription',
      convertTo: form._id.toString(),
      channel: channel._id.toString(),
    };

    const response = await request
      .post('/graphql')
      .send({
        query: `
          mutation addSubscription(
            $application: ID!,
            $routingKey: String!,
            $title: String!,
            $convertTo: ID,
            $channel: ID
          ) {
            addSubscription(
              application: $application,
              routingKey: $routingKey,
              title: $title,
              convertTo: $convertTo,
              channel: $channel
            ) {
              routingKey
              title
              convertTo
              channel
            }
          }
        `,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('addSubscription');
    const addedSubscription = response.body.data.addSubscription;
    expect(addedSubscription).toEqual({
      routingKey: variables.routingKey,
      title: variables.title,
      convertTo: variables.convertTo,
      channel: variables.channel,
    });
  });
});
