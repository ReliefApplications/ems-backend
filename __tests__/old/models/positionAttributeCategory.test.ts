import { PositionAttributeCategory, Application } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';

/**
 * Test PositionAttributeCategory Model.
 */

beforeAll(async () => {
  await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();
});

describe('PositionAttributeCategory models tests', () => {
  let positionAttributeCategory: PositionAttributeCategory;

  test('test PositionAttributeCategory model with correct data', async () => {
    const applications = await Application.find();
    for (let i = 0; i < 1; i++) {
      positionAttributeCategory = await new PositionAttributeCategory({
        title: faker.word.adjective(),
        application: applications[i]._id,
      }).save();
      expect(positionAttributeCategory._id).toBeDefined();
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

  test('test positionAttributeCategory with duplicate title', async () => {
    const duplicateAttributeCatg = {
      title: positionAttributeCategory.title,
      application: positionAttributeCategory.application,
    };
    expect(async () =>
      new PositionAttributeCategory(duplicateAttributeCatg).save()
    ).rejects.toThrow(
      'E11000 duplicate key error collection: test.positionattributecategories index: title_1_application_1 dup key'
    );
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
