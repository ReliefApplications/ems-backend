import { Layer } from '@models';
import { faker } from '@faker-js/faker';

let sublayers = [];
let drawingInfo: any = {};
/**
 * used to add drawingInfo data in the layer
 */
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

  drawingInfo = {
    renderer: {
      type: faker.random.alpha(10),
      symbol: {
        color: faker.random.alpha(10),
        size: faker.datatype.number(100),
        style: faker.random.alpha(10),
      },
      blur: faker.datatype.number(100),
      radius: faker.datatype.number(100),
      gradient: faker.random.alpha(10),
    },
  };
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
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'fields',
              PopupElementFields: {
                type: 'fields',
                title: faker.random.alpha(10),
                description: faker.lorem.paragraph(),
                fields: [
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                ],
              },
            },
          ],
        },
      };

      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer without visibility', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        sublayers: sublayers,
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'fields',
              PopupElementFields: {
                type: 'fields',
                title: faker.random.alpha(10),
                description: faker.lorem.paragraph(),
                fields: [
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                ],
              },
            },
          ],
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
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'fields',
              PopupElementFields: {
                type: 'fields',
                title: faker.random.alpha(10),
                description: faker.lorem.paragraph(),
                fields: [
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                ],
              },
            },
          ],
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer popupInfo popupElements of type text', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        sublayers: sublayers,
        visibility: false,
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'text',
              PopupElementText: {
                type: 'text',
                text: faker.random.alpha(10),
              },
            },
          ],
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer without sublayer', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        visibility: true,
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'fields',
              PopupElementFields: {
                type: 'fields',
                title: faker.random.alpha(10),
                description: faker.lorem.paragraph(),
                fields: [
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                ],
              },
            },
          ],
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer with wrong name', async () => {
    const inputData = {
      name: faker.science.unit(),
      sublayers: sublayers,
      visibility: true,
      opacity: faker.datatype.number(100),
      layerDefinition: {
        minZoom: faker.datatype.number(100),
        maxZoom: faker.datatype.number(100),
        featureReduction: {
          type: 'cluster',
          drawingInfo: drawingInfo,
          clusterRadius: faker.datatype.number(100),
        },
        drawingInfo: drawingInfo,
      },
      popupInfo: {
        title: faker.random.alpha(10),
        description: faker.lorem.paragraph(),
        popupElements: [
          {
            type: 'fields',
            PopupElementFields: {
              type: 'fields',
              title: faker.random.alpha(10),
              description: faker.lorem.paragraph(),
              fields: [
                faker.random.alpha(10),
                faker.random.alpha(10),
                faker.random.alpha(10),
              ],
            },
          },
        ],
      },
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });

  test('test layer without popupInfo', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        visibility: true,
        opacity: faker.datatype.number(100),
        layerDefinition: {
          minZoom: faker.datatype.number(100),
          maxZoom: faker.datatype.number(100),
          featureReduction: {
            type: 'cluster',
            drawingInfo: drawingInfo,
            clusterRadius: faker.datatype.number(100),
          },
          drawingInfo: drawingInfo,
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer without layerDefinition', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        visibility: true,
        opacity: faker.datatype.number(100),
        popupInfo: {
          title: faker.random.alpha(10),
          description: faker.lorem.paragraph(),
          popupElements: [
            {
              type: 'fields',
              PopupElementFields: {
                type: 'fields',
                title: faker.random.alpha(10),
                description: faker.lorem.paragraph(),
                fields: [
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                  faker.random.alpha(10),
                ],
              },
            },
          ],
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test layer with wrong opacity', async () => {
    const inputData = {
      name: faker.random.alpha(10),
      sublayers: sublayers,
      visibility: true,
      opacity: faker.random.alpha(10),
      layerDefinition: {
        minZoom: faker.datatype.number(100),
        maxZoom: faker.datatype.number(100),
        featureReduction: {
          type: 'cluster',
          drawingInfo: drawingInfo,
          clusterRadius: faker.datatype.number(100),
        },
        drawingInfo: drawingInfo,
      },
      popupInfo: {
        title: faker.random.alpha(10),
        description: faker.lorem.paragraph(),
        popupElements: [
          {
            type: 'fields',
            PopupElementFields: {
              type: 'fields',
              title: faker.random.alpha(10),
              description: faker.lorem.paragraph(),
              fields: [
                faker.random.alpha(10),
                faker.random.alpha(10),
                faker.random.alpha(10),
              ],
            },
          },
        ],
      },
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });
});
