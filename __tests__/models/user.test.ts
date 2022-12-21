import { User, Group, Application } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test User Model.
 */
describe('User models tests', () => {
  let userEmail;
  test('test User model with correct', async () => {
    for (let i = 0; i < 1; i++) {
      const groupList = await Group.find().limit(10);
      const groups = groupList.map((group) => {
        return group._id;
      });
      const application = await Application.findOne();

      userEmail = faker.internet.email();
      const inputData = {
        username: userEmail,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        name: faker.name.fullName(),
        oid: faker.datatype.uuid(),
        groups: groups,
        favoriteApp: application._id,
      };
      const saveData = await new User(inputData).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test User model with duplicate user name', async () => {
    const inputData = {
      username: userEmail,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      name: faker.name.fullName(),
    };
    expect(async () => new User(inputData).save()).rejects.toThrow(Error);
  });
});
