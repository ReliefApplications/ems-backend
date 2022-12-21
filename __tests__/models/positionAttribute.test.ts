import {
  PositionAttributeCategory,
  Application,
  PositionAttribute,
} from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Position Attribute Model.
 */
describe('PositionAttribute models tests', () => {
  test('test PositionAttribute model with correct data', async () => {
    const application = await Application.findOne();
    const attrCatg = await new PositionAttributeCategory({
      title: faker.word.adjective(),
      application: application._id,
    }).save();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        value: faker.word.adjective(),
        category: attrCatg._id,
      };
      const saveData = await new PositionAttribute(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test PositionAttribute with invalid value', async () => {
    const application = await Application.find();
    const attrCatg = await new PositionAttributeCategory({
      title: faker.word.adjective(),
      application: application[application.length - 1]._id,
    }).save();
    for (let i = 0; i < 1; i++) {
      const inputData = {
        value: faker.science.unit(),
        category: attrCatg._id,
      };
      expect(async () =>
        new PositionAttribute(inputData).save()
      ).rejects.toThrow(Error);
    }
  });
});
