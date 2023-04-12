import { Application } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Distribution List Model.
 */
describe('Distribution List models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const distributionListData = [];
      for (let j = 0; j < 10; j++) {
        distributionListData.push({
          name: faker.name.fullName(),
          emails: new Array(10).fill(faker.internet.email()),
        });
      }

      const application = await new Application({
        name: faker.word.adjective(),
        distributionLists: distributionListData,
      }).save();
      expect(application._id).toBeDefined();
      expect(application).toHaveProperty('createdAt');
      expect(application).toHaveProperty('modifiedAt');
    }
  });

  test('test with object value of disctribution name field ', async () => {
    const distributionListData = [
      {
        name: faker.science.unit(),
        emails: new Array(10).fill(faker.internet.email()),
      },
    ];

    const applicationData = {
      name: faker.word.adjective(),
      distributionLists: distributionListData,
    };
    expect(async () => new Application(applicationData).save()).rejects.toThrow(
      Error
    );
  });
});
