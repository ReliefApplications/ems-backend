import { Step, Dashboard, Form, Workflow, Resource } from '@models';
import { contentType, status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Step Model.
 */

beforeAll(async () => {
  //create Dashboard
  await new Dashboard({
    name: faker.word.adjective(),
  }).save();

  //create Form
  const formName = faker.random.alpha(10);
  const resource = await new Resource({
    name: formName,
  }).save();

  await new Form({
    name: formName,
    graphQLTypeName: formName,
    status: status.pending,
    resource: resource._id,
  }).save();
});

describe('Step models tests', () => {
  test('test Step model with correct data with dashboard type', async () => {
    const dashboard = await Dashboard.findOne();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        type: contentType.dashboard,
        content: dashboard._id,
      };
      const saveData = await new Step(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test Step model with correct data with form type', async () => {
    const form = await Form.findOne();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        type: contentType.form,
        content: form._id,
      };
      const saveData = await new Step(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test Step model with wrong name with form tyoe', async () => {
    const inputData = {
      name: faker.science.unit(),
      type: contentType.form,
    };
    expect(async () => new Step(inputData).save()).rejects.toThrow(Error);
  });

  test('test Step model with wrong name with dashboard tyoe', async () => {
    const inputData = {
      name: faker.science.unit(),
      type: contentType.dashboard,
    };
    expect(async () => new Step(inputData).save()).rejects.toThrow(Error);
  });

  test('test step delete with dashboard type', async () => {
    const dashboard = await Dashboard.findOne();

    const step = await new Step({
      name: faker.random.alpha(10),
      type: contentType.dashboard,
      content: dashboard._id,
    }).save();

    const isDelete = await Step.deleteOne({ _id: step._id });
    expect(isDelete.ok).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });

  test('test step delete with workflow', async () => {
    const step = await new Step({
      name: faker.random.alpha(10),
      type: contentType.dashboard,
    }).save();

    await new Workflow({
      name: faker.random.alpha(10),
      steps: [step._id],
    }).save();

    const isDelete = await Step.deleteOne({ _id: step._id });
    expect(isDelete.ok).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
