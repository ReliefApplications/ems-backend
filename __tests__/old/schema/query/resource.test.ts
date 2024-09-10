import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { Resource } from '@models';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';

let server: SafeTestServer;
let resource;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);

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
});
afterAll(async () => {
  await Resource.deleteOne({ _id: resource._id });
});

/**
 * Test Resource query.
 */
describe('Resource query tests', () => {
  const query =
    'query resource($id: ID!) {\
      resource(id: $id) { id, name }\
    }';

  test('query without user returns error', async () => {
    const variables = {
      id: resource._id,
    };
    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.resource).toBeNull();
  });
});
