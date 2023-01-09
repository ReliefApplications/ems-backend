import { Resource } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Layout Model.
 */
describe('Layout models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const field1 = faker.word.adjective();
      const field2 = faker.word.adjective();
      const field3 = faker.word.adjective();
      const field4 = faker.word.adjective();

      const choice1 = faker.word.adjective();
      const formName = faker.word.adjective();

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
              {
                name: field3,
                type: 'String',
                kind: 'SCALAR',
                label: field3,
                format: null,
              },
              {
                name: field4,
                type: 'JSON',
                kind: 'SCALAR',
                label: 'User question',
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

      const resource = await new Resource({
        name: formName,
        layouts: layoutLists,
      }).save();

      expect(resource._id).toBeDefined();
      expect(resource).toHaveProperty('createdAt');
      expect(resource).toHaveProperty('modifiedAt');
    }
  });

  test('test with wrong layout name field ', async () => {
    const formName = faker.word.adjective();

    const layoutLists = [
      {
        name: faker.science.unit(),
      },
    ];

    const saveData = {
      name: formName,
      layouts: layoutLists,
    };

    expect(async () => new Resource(saveData).save()).rejects.toThrow(Error);
  });
});
