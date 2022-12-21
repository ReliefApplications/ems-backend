import { Step, Workflow } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Workflow Model.
 */
describe('Workflow models tests', () => {
  test('test Workflow model with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const stepList = await Step.find();
      const steps = stepList.map((step) => {
        return step._id;
      });

      const inputData = {
        name: faker.random.alpha(10),
        steps: steps,
      };
      const saveData = await new Workflow(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test Workflow model with wrong name', async () => {
    const stepList = await Step.find();
    const steps = stepList.map((step) => {
      return step._id;
    });

    const inputData = {
      username: faker.science.unit(),
      steps: steps,
    };
    expect(async () => new Workflow(inputData).save()).rejects.toThrow(Error);
  });
});
