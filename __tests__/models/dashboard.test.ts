import { Dashboard } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Dashboard Model.
 */
describe('Dashboard models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const dashboard = await new Dashboard({
        name: faker.word.adjective(),
      }).save();
      expect(dashboard._id).toBeDefined();
      expect(dashboard).toHaveProperty('createdAt');
      expect(dashboard).toHaveProperty('modifiedAt');
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
