import { Application } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Distribution List Model.
 */
describe('Distribution List models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const disctributionListData = [];
      for (let j = 0; j < 10; j++) {
        disctributionListData.push({
          name: faker.name.fullName(),
          emails: new Array(10).fill(faker.internet.email()),
        });
      }
      const applicationData = {
        name: faker.word.adjective(),
        distributionLists: disctributionListData,
      };
      const saveData = await new Application(applicationData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test with object value of disctribution name field ', async () => {
    const disctributionListData = [
      {
        name: faker.science.unit(),
        emails: new Array(10).fill(faker.internet.email()),
      },
    ];

    const applicationData = {
      name: faker.word.adjective(),
      distributionLists: disctributionListData,
    };
    expect(async () => new Application(applicationData).save()).rejects.toThrow(
      Error
    );
  });
});
