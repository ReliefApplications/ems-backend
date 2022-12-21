import { Application, Resource, Form } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';

/**
 * Test Form Model.
 */
describe('Form models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const formName = faker.word.adjective();
      const saveResData = await new Resource({
        name: formName,
      }).save();

      const application = await Application.findOne();

      const choice1 = faker.word.adjective();
      const choice2 = faker.word.adjective();
      const choice3 = faker.word.adjective();

      const formData = {
        name: formName,
        graphQLTypeName: formName,
        status: status.pending,
        resource: saveResData._id,
        fields: [
          {
            type: 'text',
            name: faker.word.adjective(),
            isRequired: false,
            readOnly: false,
            isCore: true,
          },
          {
            type: 'checkbox',
            name: faker.word.adjective(),
            isRequired: false,
            readOnly: false,
            isCore: true,
            choices: [
              {
                value: choice1,
                text: choice1,
              },
              {
                value: choice2,
                text: choice2,
              },
              {
                value: choice3,
                text: choice3,
              },
            ],
          },
          {
            type: 'radiogroup',
            name: faker.word.adjective(),
            isRequired: false,
            readOnly: false,
            isCore: true,
            choices: [
              {
                value: choice1,
                text: choice1,
              },
              {
                value: choice2,
                text: choice2,
              },
              {
                value: choice3,
                text: choice3,
              },
            ],
          },
          {
            type: 'users',
            name: faker.word.adjective(),
            isRequired: false,
            readOnly: false,
            isCore: true,
            applications: [application._id],
          },
          {
            type: 'users',
            name: faker.word.adjective(),
            isRequired: false,
            readOnly: false,
            isCore: true,
            applications: [application._id],
          },
        ],
      };

      const saveData = await new Form(formData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with wrong status field ', async () => {
    const formName = faker.word.adjective();

    const formData = {
      name: formName,
      graphQLTypeName: formName,
      status: faker.datatype.number(),
    };

    expect(async () => new Form(formData).save()).rejects.toThrow(Error);
  });
});
