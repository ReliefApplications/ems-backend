import { Resource, Form, Record } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';

/**
 * Test Resource Model.
 */
describe('Resource models tests', () => {
  let resource: Resource;
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
      resource = await new Resource({
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

      expect(resource._id).toBeDefined();
      expect(resource).toHaveProperty('createdAt');
      expect(resource).toHaveProperty('modifiedAt');
    }
  });

  test('test Resource with duplicate name of resource', async () => {
    const inputData = {
      name: resource.name,
    };
    expect(async () => new Resource(inputData).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.resources index: name_1 dup key'
    );
  });

  test('test resource delete', async () => {
    const formName = faker.random.alpha(10);
    const resourceData = await new Resource({
      name: formName,
    }).save();

    const form = await new Form({
      name: formName,
      graphQLTypeName: formName,
      status: status.pending,
      resource: resourceData._id,
    }).save();

    await new Record({
      incrementalId:
        new Date().getFullYear() +
        '-D0000000' +
        faker.datatype.number({ min: 1000000 }),
      form: form._id,
      resource: resourceData._id,
      archived: 'false',
      data: faker.science.unit(),
    }).save();

    const isDelete = await Resource.deleteOne({ _id: resourceData._id });
    expect(isDelete.acknowledged).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
