import { Record, Form, Resource, User } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Record Model.
 */
describe('Record models tests', () => {
  test('test Record model with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const user = await new User({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        username: faker.internet.email(),
        name: faker.name.fullName(),
      }).save();
      const formName = faker.random.alpha(10);
      const form = await new Form({
        name: formName,
        graphQLTypeName: formName,
      }).save();
      const resource = await new Resource({
        name: faker.word.adjective(),
      }).save();

      const records = [];
      for (let j = 0; j < 10; j++) {
        records.push({
          field_1: faker.vehicle.vehicle(),
          field_2: [faker.word.adjective(), faker.word.adjective()],
          field_3: faker.word.adjective(),
          user_question: [user._id],
          user_ques_two: [user._id],
        });
      }

      const inputData = {
        incrementalId: new Date().getFullYear() + '-D0000000' + (i + 1),
        form: form._id,
        resource: resource._id,
        archived: 'false',
        data: records,
        createdBy: user._id,
      };
      const saveData = await new Record(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test Record model without incrementalId', async () => {
    for (let i = 0; i < 1; i++) {
      const formName = faker.random.alpha(10);
      const form = await new Form({
        name: formName,
        graphQLTypeName: formName,
      }).save();
      const resource = await new Resource({
        name: faker.word.adjective(),
      }).save();

      const inputData = {
        form: form._id,
        resource: resource._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test Record model without form', async () => {
    for (let i = 0; i < 1; i++) {
      const resource = await new Resource({
        name: faker.random.alpha(10),
      }).save();

      const inputData = {
        incrementalId: new Date().getFullYear() + '-D0000000' + (i + 1),
        resource: resource._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test Record model without resource', async () => {
    for (let i = 0; i < 1; i++) {
      const formName = faker.random.alpha(10);
      const form = await new Form({
        name: formName,
        graphQLTypeName: formName,
      }).save();
      const inputData = {
        incrementalId: new Date().getFullYear() + '-D0000000' + (i + 1),
        form: form._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });
});
