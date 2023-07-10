import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { acquireToken } from '../../authentication.setup';
import { Layer } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let layer;
let sublayers;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  layer = await new Layer({
    name: faker.random.alpha(10),
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
  const query = `mutation editNewLayer($id: ID! $name: String! $sublayers: [ID] $parent: ID) {\
        editLayer(id: $id, name: $name, sublayers: $sublayers, parent: $parent) { 
          id
          name
          createdAt
        }\
      }`;

  test('query without user returns error', async () => {
    const variables = {
      id: layer._id,
      name: faker.random.alpha(10),
      sublayers: [],
      parent: '',
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.editLayer).toBeNull();
  });

  test('query with admin user and without sublayer returns expected layer', async () => {
    const variables = {
      id: layer._id,
      name: faker.random.alpha(10),
      sublayers: [],
      parent: '',
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.editLayer).toHaveProperty('id');
    expect(response.body.data.editLayer).toHaveProperty('createdAt');
  });

  test('query with admin user and with sublayer returns expected layer', async () => {
    const variables = {
      id: layer._id,
      name: faker.random.alpha(10),
      sublayers: sublayers,
      parent: '',
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.editLayer).toHaveProperty('id');
    expect(response.body.data.editLayer).toHaveProperty('createdAt');
  });

  test('query with admin user and with parent parameter returns expected layer', async () => {
    const newLayer = await new Layer({
      name: faker.random.alpha(10),
      sublayers: sublayers,
    }).save();

    const parentLayer = await new Layer({
      name: faker.random.alpha(10),
    }).save();

    const editVaraible = {
      id: sublayers[0]._id,
      name: faker.random.alpha(10),
      sublayers: [],
      parent: parentLayer._id,
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables: editVaraible })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.editLayer).toHaveProperty('id');
    expect(response.body.data.editLayer).toHaveProperty('createdAt');

    const oldParentLayer = await Layer.findById(newLayer._id);
    expect(oldParentLayer.sublayers).toEqual(
      expect.not.arrayContaining([sublayers[0]._id])
    );

    const latestParentLayer = await Layer.findById(parentLayer._id);
    expect(latestParentLayer.sublayers).toEqual(
      expect.arrayContaining([sublayers[0]._id])
    );
  });
});
