import { Permission } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Permission Model.
 */
describe('Permission models tests', () => {
  let permission: Permission;
  test('test with globel permission', async () => {
    for (let i = 0; i < 1; i++) {
      permission = await new Permission({
        type: faker.random.word(),
        global: true,
      }).save();
      expect(permission._id).toBeDefined();
    }
  });

  test('test with local permission', async () => {
    for (let i = 0; i < 1; i++) {
      const permissionData = await new Permission({
        type: faker.random.word(),
        global: false,
      }).save();
      expect(permissionData._id).toBeDefined();
    }
  });

  test('test permission with duplicate type', async () => {
    const duplicatePermission = {
      type: permission.type,
      global: true,
    };
    expect(async () =>
      new Permission(duplicatePermission).save()
    ).rejects.toThrow(
      'E11000 duplicate key error collection: test.permissions index: type_1_global_1 dup key'
    );
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
