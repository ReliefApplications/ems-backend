import { Application } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Application Model.
 */
describe('Application models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.internet.userName(),
        status: status.pending,
      };
      const saveData = await new Application(apiConfig).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test with incorrect application status field', async () => {
    for (let i = 0; i < 1; i++) {
      const apiConfig = {
        name: faker.internet.userName(),
        status: faker.datatype.number(),
      };
      expect(async () => new Application(apiConfig).save()).rejects.toThrow(
        Error
      );
    }
  });
});
