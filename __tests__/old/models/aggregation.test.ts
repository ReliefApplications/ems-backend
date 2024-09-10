import { Resource } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Aggregation query.
 */
describe('Aggregation models tests', () => {
  let resource: Resource;
  test('test with correct data', async () => {
    const field1 = faker.word.adjective();
    const field2 = faker.word.adjective();
    const field3 = faker.word.adjective();
    const field4 = faker.word.adjective();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.word.adjective(),
        permissions: [],
        aggregations: {
          name: faker.word.adjective(),
          sourceFields: [field1, field2, field3, field4],
          pipeline: [
            {
              type: 'filter',
              form: {
                logic: 'and',
                filters: [
                  {
                    field: field2,
                    value: faker.word.adjective(),
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
                    field: field2,
                    expression: {
                      operator: null,
                      field: '',
                    },
                  },
                ],
                addFields: [
                  {
                    name: '',
                    expression: {
                      operator: 'sum',
                      field: field3,
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
      };
      resource = await new Resource(inputData).save();
      expect(resource._id).toBeDefined();
      expect(resource).toHaveProperty('createdAt');
      expect(resource).toHaveProperty('modifiedAt');
    }
  });

  test('test Resource with duplicate name', async () => {
    const duplicateResource = {
      name: resource.name,
    };
    expect(async () => new Resource(duplicateResource).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.resources index: name_1 dup key'
    );
  });

  test('test with incorrect resource name field', async () => {
    for (let i = 0; i < 1; i++) {
      const resourceInput = {
        name: '',
      };
      expect(async () => new Resource(resourceInput).save()).rejects.toThrow(
        Error
      );
    }
  });
});
