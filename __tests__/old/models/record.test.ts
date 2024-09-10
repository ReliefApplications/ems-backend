import { Record, Form, Resource, User, Version } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Record Model.
 */

beforeAll(async () => {
  //create User
  await new User({
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    username: faker.internet.email(),
    name: faker.name.fullName(),
  }).save();

  const formName = faker.random.alpha(10);

  //create Resource
  const resource = await new Resource({
    name: formName,
  }).save();

  //create Form
  await new Form({
    name: formName,
    graphQLTypeName: formName,
    resource: resource._id,
  }).save();
});

describe('Record models tests', () => {
  let incrementalId = '';
  let formId = '';
  let resourceId = '';
  let data = [];
  test('test Record model with correct data', async () => {
    const user = await User.findOne();
    const form = await Form.findOne();
    const resource = await Resource.findOne();

    formId = form._id;
    resourceId = resource._id;
    for (let i = 0; i < 1; i++) {
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
      incrementalId =
        new Date().getFullYear() +
        '-D0000000' +
        faker.datatype.number({ min: 1000000 });
      data = records;
      const inputData = {
        incrementalId: incrementalId,
        form: formId,
        resource: resourceId,
        archived: 'false',
        data: records,
        createdBy: user._id,
      };
      const saveData = await new Record(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test record with duplicate incrementalId', async () => {
    const duplicateRecord = {
      incrementalId: incrementalId,
      form: formId,
      resource: resourceId,
      data: data,
    };
    expect(async () => new Record(duplicateRecord).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.records index: incrementalId_1_resource_1 dup key'
    );
  });

  test('test Record model without incrementalId', async () => {
    const form = await Form.findOne();
    const resource = await Resource.findOne();

    for (let i = 0; i < 1; i++) {
      const inputData = {
        form: form._id,
        resource: resource._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test Record model without form', async () => {
    const resource = await Resource.findOne();

    for (let i = 0; i < 1; i++) {
      const inputData = {
        incrementalId: new Date().getFullYear() + '-D0000000' + (i + 1),
        resource: resource._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test Record model without resource', async () => {
    const form = await Form.findOne();

    for (let i = 0; i < 1; i++) {
      const inputData = {
        incrementalId: new Date().getFullYear() + '-D0000000' + (i + 1),
        form: form._id,
        archived: 'false',
      };
      expect(async () => new Record(inputData).save()).rejects.toThrow(Error);
    }
  });

  test('test record delete', async () => {
    const versions = [];
    for (let i = 0; i < 10; i++) {
      const version = await new Version({
        data: faker.science.unit(),
      }).save();
      versions.push(version._id);
    }

    const form = await Form.findOne();
    const resource = await Resource.findOne();

    const record = await new Record({
      incrementalId:
        new Date().getFullYear() +
        '-D0000000' +
        faker.datatype.number({ min: 1000000 }),
      form: form._id,
      resource: resource._id,
      archived: 'false',
      data: faker.science.unit(),
      versions: versions,
    }).save();

    const isDelete = await Record.deleteOne({ _id: record._id });
    expect(isDelete.acknowledged).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
