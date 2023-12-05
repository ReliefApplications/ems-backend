import schema from '../../../src/schema';
import { SafeTestServer } from '../../server.setup';
import supertest from 'supertest';
import { acquireToken } from '../../authentication.setup';
import { Role, User, Application } from '@models';
import { faker } from '@faker-js/faker';

let server: SafeTestServer;
let request: supertest.SuperTest<supertest.Test>;
let token: string;

beforeAll(async () => {
  const admin = await Role.findOne({ title: 'admin' });
  await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [admin._id] });

  server = new SafeTestServer();
  await server.start(schema);
  request = supertest(server.app);
  token = `Bearer ${await acquireToken()}`;
});

describe('Add Template Mutation Tests', () => {
  test('should add a new template with valid data', async () => {
    const application = await Application.create({ name: 'Test Application' });

    const variables = {
      application: application._id.toString(),
      template: {
        name: faker.lorem.word(),
        type: faker.lorem.word(),
        content: faker.lorem.paragraph(),
      },
    };

    const response = await request
      .post('/graphql')
      .send({
        query: `
          mutation addTemplate(
            $application: ID!,
            $template: TemplateInput!
          ) {
            addTemplate(
              application: $application,
              template: $template
            ) {
              name
              type
              content
            }
          }
        `,
        variables,
      })
      .set('Authorization', token)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('addTemplate');
    const addedTemplate = response.body.data.addTemplate;
    expect(addedTemplate).toEqual({
      name: variables.template.name,
      type: variables.template.type,
      content: variables.template.content,
    });
  });
});
