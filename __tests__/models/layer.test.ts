import { Layer, Resource } from '@models';
import { faker } from '@faker-js/faker';
import { layerDataSourceType, layerType } from '@const/enumTypes';

let sublayers = [];
/**
 * used to add popupElements data in the layer
 */
const popupElements = [];
let resource;
beforeAll(async () => {
  const layers = [];
  for (let i = 0; i < 10; i++) {
    layers.push({
      name: faker.random.alpha(10),
      datasource: {
        type: layerDataSourceType.resource,
      },
    });
  }
  const layerList: any = await Layer.insertMany(layers);
  sublayers = layerList.map((layer) => {
    return layer._id;
  });

  for (let i = 0; i < 10; i++) {
    popupElements.push(faker.science.unit());
  }

  const field1 = faker.word.adjective();
  const formName = faker.word.adjective();
  resource = await new Resource({
    name: formName,
    layouts: [
      {
        name: formName,
        query: {
          name: formName,
          template: '',
          filter: {
            logic: 'and',
            filters: [
              {
                field: field1,
                operator: 'eq',
                value: 'test',
              },
            ],
          },
          pageSize: 10,
          fields: [
            {
              name: field1,
              type: 'String',
              kind: 'SCALAR',
              label: field1,
              format: null,
            },
          ],
          sort: {
            field: field1,
            order: 'asc',
          },
          style: [],
        },
      },
    ],
    aggregations: {
      name: formName,
      sourceFields: [field1],
      pipeline: [
        {
          type: 'filter',
          form: {
            logic: 'and',
            filters: [
              {
                field: field1,
                value: formName,
              },
            ],
          },
        },
        {
          type: 'sort',
          form: {
            field: field1,
            order: 'asc',
          },
        },
        {
          type: 'group',
          form: {
            groupBy: [
              {
                field: field1,
                expression: {
                  operator: null,
                  field: '',
                },
              },
            ],
          },
        },
        {
          type: 'addFields',
          form: [
            {
              name: 'fieldnew',
              expression: {
                operator: 'add',
                field: field1,
              },
            },
          ],
        },
        {
          type: 'unwind',
          form: {
            field: field1,
          },
        },
      ],
    },
  }).save();
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
        datasource: {
          type: layerDataSourceType.resource,
          layout: resource.layouts._id,
          aggregation: resource.aggregations._id,
        },
      };

      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test without datasource type', async () => {
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
        datasource: {
          layout: resource.layouts._id,
          aggregation: resource.aggregations._id,
        },
      };
      expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test with Reference datasource data', async () => {
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
        datasource: {
          type: layerDataSourceType.reference,
          layout: resource.layouts._id,
          aggregation: resource.aggregations._id,
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test without aggregation data', async () => {
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
        datasource: {
          type: layerDataSourceType.resource,
          layout: resource.layouts._id,
        },
      };
      const layer = await new Layer(inputData).save();
      expect(layer._id).toBeDefined();
    }
  });

  test('test without datasource layout', async () => {
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
        datasource: {
          type: layerDataSourceType.reference,
          aggregation: resource.aggregations._id,
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
        datasource: {
          type: layerDataSourceType.resource,
          layout: resource.layouts._id,
          aggregation: resource.aggregations._id,
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
      datasource: {
        type: layerDataSourceType.resource,
        layout: resource.layouts._id,
        aggregation: resource.aggregations._id,
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
      datasource: {
        type: layerDataSourceType.resource,
        layout: resource.layouts._id,
        aggregation: resource.aggregations._id,
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
      datasource: {
        type: layerDataSourceType.resource,
        layout: resource.layouts._id,
        aggregation: resource.aggregations._id,
      },
    };
    expect(async () => new Layer(inputData).save()).rejects.toThrow(Error);
  });
});
