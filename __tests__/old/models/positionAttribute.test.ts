import {
  PositionAttributeCategory,
  Application,
  PositionAttribute,
} from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';

/**
 * Test Position Attribute Model.
 */

beforeAll(async () => {
  await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();
});

describe('PositionAttribute models tests', () => {
  test('test PositionAttribute model with correct data', async () => {
    const application = await Application.findOne();
    const attrCatg = await new PositionAttributeCategory({
      title: faker.word.adjective(),
      application: application._id,
    }).save();
    for (let i = 0; i < 1; i++) {
      const positionAttribute = await new PositionAttribute({
        value: faker.word.adjective(),
        category: attrCatg._id,
      }).save();
      expect(positionAttribute._id).toBeDefined();
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
