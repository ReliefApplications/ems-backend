import { Resource } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Aggregation query.
 */
describe('Aggregation models tests', () => {
  test('test with correct data', async () => {
    const field1 = faker.word.adjective();
    const field2 = faker.word.adjective();
    const field3 = faker.word.adjective();
    const field4 = faker.word.adjective();
    for (let i = 0; i < 1; i++) {
      const resource = {
        name: faker.internet.userName(),
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
      const saveData = await new Resource(resource).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with incorrect resource name field', async () => {
    for (let i = 0; i < 1; i++) {
      const resource = {
        name: '',
      };
      expect(async () => await new Resource(resource).save()).rejects.toThrow(
        Error
      );
    }
  });
});
