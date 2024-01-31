import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application, Channel, Form } from '@models';
import { faker } from '@faker-js/faker';

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
    const application = await new Application({
      name: faker.random.words(),
    }).save();
    const channel = await new Channel({
      title: faker.random.words(),
      application: application._id,
    }).save();
    const formName = faker.random.words();
    const graphQLTypeName = Form.getGraphQLTypeName(formName);
    const form = await new Form({
      name: formName,
      graphQLTypeName: graphQLTypeName,
    }).save();

    const routingKey = await Application.findOne({
      'subscriptions.routingKey': { $exists: true, $ne: null },
    });

    const variables = {
      application: application._id.toString(),
      routingKey: routingKey.subscriptions[0].routingKey,
      title: faker.random.words(),
      convertTo: form._id.toString(),
      channel: channel.id.toString(),
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
              convertTo {
                id
                name
              }
              channel {
                id
                title
              }
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
