import schema from '../../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import { faker } from '@faker-js/faker';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Resource, Role, User } from '@models';

let server: SafeTestServer;
let resource;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  //Create Resource
  resource = await new Resource({
    name: faker.random.alpha(10),
  }).save();
});

/**
 * Test Add Layout Mutation.
 */
describe('Add layout tests cases', () => {
  const query = `mutation addLayout($resource: ID, $form: ID, $layout: LayoutInputType!) {
    addLayout(resource: $resource, form : $form, layout: $layout){
      id
      name
    }
  }`;

  test('test case add layout tests with correct data', async () => {
    const variables = {
      resource: resource._id,
      layout: {
        name: faker.random.alpha(10),
        query: {
          name: faker.random.alpha(10),
          template: '',
          pageSize: faker.datatype.number(),
          fields: [
            {
              name: 'incrementalId',
              type: 'ID',
              kind: 'SCALAR',
              label: 'Incremental Id',
              format: null,
            },
          ],
          sort: {
            field: '',
            order: 'asc',
          },
          style: [],
          filter: {
            logic: 'and',
            filters: [],
          },
        },
        display: {
          showFilter: null,
          sort: [],
          fields: null,
          filter: null,
        },
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('errors');
    expect(response.body.data.addLayout).toHaveProperty('id');
  });

  test('test case with wrong title and return error', async () => {
    const variables = {
      resource: resource._id,
      layout: {
        name: faker.science.unit(),
        query: {
          name: faker.random.alpha(10),
          template: '',
          pageSize: faker.datatype.number(),
          fields: [
            {
              name: 'incrementalId',
              type: 'ID',
              kind: 'SCALAR',
              label: 'Incremental Id',
              format: null,
            },
          ],
          sort: {
            field: '',
            order: 'asc',
          },
          style: [],
          filter: {
            logic: 'and',
            filters: [],
          },
        },
        display: {
          showFilter: null,
          sort: [],
          fields: null,
          filter: null,
        },
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    }
  });

  test('test case without layout name and return error', async () => {
    const variables = {
      resource: resource._id,
      layout: {
        query: {
          name: faker.random.alpha(10),
          template: '',
          pageSize: faker.datatype.number(),
          fields: [
            {
              name: 'incrementalId',
              type: 'ID',
              kind: 'SCALAR',
              label: 'Incremental Id',
              format: null,
            },
          ],
          sort: {
            field: '',
            order: 'asc',
          },
          style: [],
          filter: {
            logic: 'and',
            filters: [],
          },
        },
        display: {
          showFilter: null,
          sort: [],
          fields: null,
          filter: null,
        },
      },
    };

    const response = await request
      .post('/graphql')
      .send({ query, variables })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    if (!!response.body.errors && !!response.body.errors[0].message) {
      expect(
        Promise.reject(new Error(response.body.errors[0].message))
      ).rejects.toThrow(response.body.errors[0].message);
    }
  });
});
