import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Layer, Role, User } from '@models';

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

/**
 * Test Layer add mutation.
 */
describe('Add Layer mutation tests', () => {
  const query = `mutation addLayer($layer: LayerInputType!) {
      addLayer(layer: $layer) { 
          id
          name
          sublayers
        }
      }`;

  test('query without user returns error', async () => {
    const variables = {
      layer: {
        name: faker.random.alpha(10),
        sublayers: [],
      },
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    }
  });

  test('query with admin user and without sublayer returns expected layer', async () => {
    const variables = {
      layer: {
        name: faker.random.alpha(10),
        sublayers: [],
      },
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addLayer).toHaveProperty('id');
    expect(response.body.data.addLayer).toHaveProperty('sublayers');
  });

  test('query with admin user and with sublayer returns expected layer', async () => {
    const layers = [];
    for (let i = 0; i < 10; i++) {
      layers.push({
        name: faker.random.alpha(10),
      });
    }
    const layerList: any = await Layer.insertMany(layers);
    const sublayers = layerList.map((layer) => {
      return layer._id;
    });

    const variables = {
      layer: {
        name: faker.random.alpha(10),
        sublayers: sublayers,
      },
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addLayer).toHaveProperty('id');
    expect(response.body.data.addLayer).toHaveProperty('sublayers');
  });
});
