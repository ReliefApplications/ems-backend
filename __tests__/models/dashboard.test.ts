import { Dashboard } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Dashboard Model.
 */
describe('Dashboard models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const dashboardData = {
        name: faker.word.adjective(),
      };
      const saveData = await new Dashboard(dashboardData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with object value of dashboard name field ', async () => {
    const dashboardData = {
      name: faker.science.unit(),
    };
    expect(async () => new Dashboard(dashboardData).save()).rejects.toThrow(
      Error
    );
  });
});
