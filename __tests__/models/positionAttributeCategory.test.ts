import { PositionAttributeCategory, Application } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test PositionAttributeCategory Model.
 */
describe('PositionAttributeCategory models tests', () => {
  test('test PositionAttributeCategory model with correct data', async () => {
    const applications = await Application.find();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        title: faker.word.adjective(),
        application: applications[i]._id,
      };
      const saveData = await new PositionAttributeCategory(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test PositionAttributeCategory model without title', async () => {
    const application = await Application.findOne().sort({ createdAt: -1 });
    for (let i = 0; i < 1; i++) {
      const inputData = {
        application: application._id,
      };
      expect(async () =>
        new PositionAttributeCategory(inputData).save()
      ).rejects.toThrow(Error);
    }
  });

  test('test PositionAttributeCategory model with blank application', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        title: faker.word.adjective(),
      };
      expect(async () =>
        new PositionAttributeCategory(inputData).save()
      ).rejects.toThrow(Error);
    }
  });
});
