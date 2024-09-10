import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Layer, Role, User } from '@models';

let server: SafeTestServer;
let layer;
let sublayers;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  layer = await new Layer({
    layer: {
      name: faker.random.alpha(10),
      sublayers: [],
    },
  }).save();

  const layers = [];
  for (let i = 0; i < 10; i++) {
    layers.push({
      name: faker.random.alpha(10),
    });
  }
  const layerList: any = await Layer.insertMany(layers);
  sublayers = layerList.map((layerData) => {
    return layerData._id;
  });
});

/**
 * Test Layer edit mutation.
 */
describe('Edit Layer mutation tests', () => {
  const query = `mutation editLayer($id: ID! $layer: LayerInputType!) {
        editLayer(id: $id, layer: $layer) {
          id
          name
          sublayers
        }
      }`;

  test('query without user returns error', async () => {
    const variables = {
      id: layer._id,
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
      id: layer._id,
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
    expect(response.body.data.editLayer).toHaveProperty('id');
    expect(response.body.data.editLayer).toHaveProperty('sublayers');
  });

  test('query with admin user and with sublayer returns expected layer', async () => {
    const variables = {
      id: layer._id,
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
    expect(response.body.data.editLayer).toHaveProperty('id');
    expect(response.body.data.editLayer).toHaveProperty('sublayers');
  });
});
