import { Resource } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Resource Model.
 */
describe('Layout models tests', () => {
  let resourceName;
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const field1 = faker.word.adjective();
      const field2 = faker.word.adjective();
      const field3 = faker.word.adjective();
      const field4 = faker.word.adjective();

      const choice1 = faker.word.adjective();
      const formName = faker.random.alpha(10);

      const layoutLists = [];
      for (let j = 0; j < 1; j++) {
        const layoutData = {
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
                {
                  field: field2,
                  operator: 'contains',
                  value: [choice1],
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
              {
                name: field2,
                type: 'JSON',
                kind: 'SCALAR',
                label: field2,
                format: null,
              },
            ],
            sort: {
              field: field1,
              order: 'asc',
            },
            style: [],
          },
        };
        layoutLists.push(layoutData);
      }
      resourceName = formName;
      const saveData = await new Resource({
        name: formName,
        layouts: layoutLists,
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
      }).save();

      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test Resource with duplicate name of resource', async () => {
    const inputData = {
      name: resourceName,
    };
    expect(async () => new Resource(inputData).save()).rejects.toThrow(Error);
  });
});
