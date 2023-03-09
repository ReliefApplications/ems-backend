import { Layer } from '@models';
import { faker } from '@faker-js/faker';
import { layerType } from '@const/enumTypes';

let sublayers = [];
const popupElements = [];
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

  for (let i = 0; i < 10; i++) {
    popupElements.push(faker.science.unit());
  }
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
        visibility: true,
        layerType: layerType.featureLayer,
        layerDefinition: {
          featureReduction: faker.science.unit(),
          drawingInfo: faker.science.unit(),
        },
        popupInfo: {
          popupElements: popupElements,
          description: faker.lorem.paragraph(),
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test with visibility false', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        sublayers: sublayers,
        visibility: false,
        layerType: layerType.featureLayer,
        layerDefinition: {
          featureReduction: faker.science.unit(),
          drawingInfo: faker.science.unit(),
        },
        popupInfo: {
          popupElements: popupElements,
          description: faker.lorem.paragraph(),
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer without sublayer', async () => {
    const inputData = {
      name: faker.random.alpha(10),
      sublayers: [],
      visibility: false,
      layerType: layerType.featureLayer,
      layerDefinition: {
        featureReduction: faker.science.unit(),
        drawingInfo: faker.science.unit(),
      },
      popupInfo: {
        popupElements: popupElements,
        description: faker.lorem.paragraph(),
      },
    };
    const layer = await new Layer(inputData).save();
    expect(layer._id).toBeDefined();
  });

  test('test layer with wrong layer name and with sublayer', async () => {
    const inputData = {
      name: faker.science.unit(),
      sublayers: sublayers,
      visibility: false,
      layerType: layerType.featureLayer,
      layerDefinition: {
        featureReduction: faker.science.unit(),
        drawingInfo: faker.science.unit(),
      },
      popupInfo: {
        popupElements: popupElements,
        description: faker.lorem.paragraph(),
      },
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });

  test('test layer with wrong layer name and without sublayer', async () => {
    const inputData = {
      name: faker.science.unit(),
      sublayers: [],
      visibility: false,
      layerType: layerType.featureLayer,
      layerDefinition: {
        featureReduction: faker.science.unit(),
        drawingInfo: faker.science.unit(),
      },
      popupInfo: {
        popupElements: popupElements,
        description: faker.lorem.paragraph(),
      },
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });
});
