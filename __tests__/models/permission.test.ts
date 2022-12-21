import { Permission } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Permission Model.
 */
describe('Permission models tests', () => {
  test('test with globel permission', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        type: faker.random.word(),
        global: true,
      };
      const saveData = await new Permission(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test with local permission', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        type: faker.random.word(),
        global: false,
      };
      const saveData = await new Permission(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test with blank type permission', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        type: '',
        global: false,
      };
      expect(async () => new Permission(inputData).save()).rejects.toThrow(
        Error
      );
    }
  });
});
