import schema from '../../../src/schema';
import supertest from 'supertest';
import { SafeTestServer } from '../server.setup';
import { acquireToken } from '../authentication.setup';
import { Resource, Form, Record } from '../../../src/models';
import { getNextId } from '../../../src/utils/form';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

let newRecord1Ref: Record;

beforeAll(async () => {
  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;

  // Creates a resource and a form with a few records to prepare for the export
  const newResource = new Resource({
    name: 'AutomatedTestResource',
    fields: [
      {
        type: 'text',
        name: 'test_field_1',
        isRequired: false,
        readOnly: false,
        isCore: true,
        defaultValue: 'This is test field 1',
      },
      {
        type: 'text',
        name: 'test_field_2',
        isRequired: false,
        readOnly: false,
        isCore: true,
        defaultValue: 'This is test field 2',
      },
    ],
  });
  const newResourceRef = await newResource.save();

  const newForm = new Form({
    name: 'AutomatedTestForm',
    structure: '',
    resource: newResourceRef._id,
  });
  const newFormRef = await newForm.save();

  const { incrementalId, incID } = await getNextId(String(newFormRef._id));

  const newRecord1 = new Record({
    incrementalId,
    incID,
    form: newFormRef._id,
    resource: newResourceRef._id,
    data: {
      test_field_1: 'Test field 1 data',
      test_field_2: 'Test field 2 data',
    },
  });
  newRecord1Ref = await newRecord1.save();
});

describe('download csv export', () => {
  const query = `{"exportOptions":{"records":"all","fields":"all","format":"csv"},"ids":[${newRecord1Ref._id}],"filter":{"logic":"and","filters":[{"filters":[],"logic":"and"},{"logic":"and","filters":[]}]},"format":"csv"}`;

  test('query returns error', async () => {
    const response = await request
      .post('/download/records')
      .send({ query })
      .set('Authorization', token)
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
  });
});
