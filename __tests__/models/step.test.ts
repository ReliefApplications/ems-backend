import { Step, Dashboard, Form } from '@models';
import { contentType, status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Step Model.
 */
describe('Step models tests', () => {
  test('test Step model with correct data with dashboard type', async () => {
    for (let i = 0; i < 1; i++) {
      const dashboard = await new Dashboard({
        name: faker.word.adjective(),
      }).save();

      const inputData = {
        name: faker.random.alpha(10),
        type: contentType.dashboard,
        content: dashboard._id,
      };
      const saveData = await new Step(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test Step model with correct data with form type', async () => {
    for (let i = 0; i < 1; i++) {
      const formName = faker.random.alpha(10);
      const form = await new Form({
        name: formName,
        graphQLTypeName: formName,
        status: status.pending,
      }).save();

      const inputData = {
        name: faker.random.alpha(10),
        type: contentType.form,
        content: form._id,
      };
      const saveData = await new Step(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test Step model with wrong name', async () => {
    const inputData = {
      name: faker.science.unit(),
      type: contentType.form,
    };
    expect(async () => new Step(inputData).save()).rejects.toThrow(Error);
  });
});
