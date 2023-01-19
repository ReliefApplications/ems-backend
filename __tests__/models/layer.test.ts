import { Layer } from '@models';
import { faker } from '@faker-js/faker';

let sublayers = [];
beforeAll(async () => {
  const layers = [];
  for (let i = 0; i < 10; i++) {
    layers.push({
      name: faker.random.alpha(10),
    });
  }
  const layerList: any = await Layer.insertMany(layers);
  sublayers = layerList.map((layer) => {
    return layer._id;
  });
});

/**
 * Test Layer Model.
 */
describe('Layer models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        sublayers: sublayers,
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer without sublayer', async () => {
    const inputData = {
      name: faker.random.alpha(10),
      sublayers: [],
    };
    const layer = await new Layer(inputData).save();
    expect(layer._id).toBeDefined();
  });

  test('test layer with wrong layer name and with sublayer', async () => {
    const inputData = {
      name: faker.science.unit(),
      sublayers: sublayers,
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });

  test('test layer with wrong layer name and without sublayer', async () => {
    const inputData = {
      name: faker.science.unit(),
      sublayers: [],
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });
});
