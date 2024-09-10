import { Application, Resource, Form, Record, Channel } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';
import { camelCase, toUpper } from 'lodash';

/**
 * Test Form Model.
 */

beforeAll(async () => {
  await new Application({
    name: faker.random.alpha(10),
    status: status.pending,
  }).save();
});

describe('Form models tests', () => {
  let form: Form;
  test('test form with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const formName = faker.random.alpha(10);
      const resource = await new Resource({
        name: formName,
      }).save();

      const application = await Application.findOne();

      const choice1 = faker.word.adjective();
      const choice2 = faker.word.adjective();
      const choice3 = faker.word.adjective();

      const inputData = {
        name: formName,
        graphQLTypeName: Form.getGraphQLTypeName(formName),
        status: status.pending,
        resource: resource._id,
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

      form = await new Form(inputData).save();
      expect(form._id).toBeDefined();
      expect(form).toHaveProperty('createdAt');
      expect(form).toHaveProperty('modifiedAt');
    }
  });

  test('test form with duplicate name', async () => {
    const duplicateForm = {
      name: form.name,
      graphQLTypeName: Form.getGraphQLTypeName(form.name),
      status: status.pending,
      resource: form.resource,
    };
    expect(async () => new Form(duplicateForm).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.forms index: graphQLTypeName_1 dup key'
    );
  });

  test('test from getGraphQLTypeName without space in form name', () => {
    const formName = faker.random.alpha(10);
    expect(Form.getGraphQLTypeName(formName)).toEqual(
      camelCase(formName).replace(/^(.)/, toUpper)
    );
  });

  test('test getGraphQLTypeName with space in form name', () => {
    const formName = faker.name.fullName();
    expect(Form.getGraphQLTypeName(formName)).toEqual(
      camelCase(formName).replace(/^(.)/, toUpper)
    );
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

  test('test form delete', async () => {
    const formName = faker.random.alpha(10);

    const formData = await new Form({
      name: formName,
      graphQLTypeName: formName,
      status: status.pending,
      resource: form.resource,
    }).save();

    const records = [];
    for (let j = 0; j < 10; j++) {
      records.push({
        field_1: faker.vehicle.vehicle(),
        field_2: [faker.word.adjective(), faker.word.adjective()],
        field_3: faker.word.adjective(),
      });
    }

    for (let i = 0; i < 10; i++) {
      await new Record({
        incrementalId:
          new Date().getFullYear() +
          '-D0000000' +
          faker.datatype.number({ min: 1000000 }),
        form: formData._id,
        data: records,
      }).save();
    }

    for (let i = 0; i < 10; i++) {
      await new Channel({
        title: faker.random.alpha(10),
        form: formData._id,
      }).save();
    }

    const isDelete = await Form.deleteOne({ _id: formData._id });
    expect(isDelete.acknowledged).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
