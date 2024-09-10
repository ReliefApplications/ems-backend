import { Step, Workflow, Dashboard } from '@models';
import { faker } from '@faker-js/faker';
import { contentType } from '@const/enumTypes';

/**
 * Test Workflow Model.
 */

beforeAll(async () => {
  const dashboard = await new Dashboard({
    name: faker.word.adjective(),
  }).save();

  const steps = [];
  for (let i = 0; i < 10; i++) {
    steps.push({
      name: faker.random.alpha(10),
      type: contentType.dashboard,
      content: dashboard._id,
    });
  }
  await Step.insertMany(steps);
});

describe('Workflow models tests', () => {
  test('test Workflow model with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const stepList = await Step.find();
      const steps = stepList.map((step) => {
        return step._id;
      });

      const workflow = await new Workflow({
        name: faker.random.alpha(10),
        steps: steps,
      }).save();
      expect(workflow._id).toBeDefined();
      expect(workflow).toHaveProperty('createdAt');
      expect(workflow).toHaveProperty('modifiedAt');
    }
  });

  test('test Workflow model with wrong name', async () => {
    const stepList = await Step.find();
    const steps = stepList.map((step) => {
      return step._id;
    });

    const inputData = {
      name: faker.science.unit(),
      steps: steps,
    };
    expect(async () => new Workflow(inputData).save()).rejects.toThrow(Error);
  });

  test('test workflow delete', async () => {
    const stepList = await Step.find();
    const steps = stepList.map((step) => {
      return step._id;
    });

    const workflow = await new Workflow({
      name: faker.random.alpha(10),
      steps: steps,
    }).save();

    const isDelete = await Workflow.deleteOne({ _id: workflow._id });
    expect(isDelete.ok).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
