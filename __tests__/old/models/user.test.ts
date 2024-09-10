import { User, Group, Application } from '@models';
import { faker } from '@faker-js/faker';
import { status } from '@const/enumTypes';

/**
 * Test User Model.
 */

beforeAll(async () => {
  //create Group
  const groups = [];
  for (let i = 0; i < 10; i++) {
    groups.push({
      name: faker.word.adjective(),
    });
  }
  await Group.insertMany(groups);

  //create Application
  await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();
});

describe('User models tests', () => {
  let userEmail;
  let user: User;
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
      user = await new User(inputData).save();
      expect(user._id).toBeDefined();
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('modifiedAt');
    }
  });

  test('test User with duplicate oid', async () => {
    const inputData = {
      oid: user.oid,
    };
    expect(async () => new User(inputData).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.users index: oid_1 dup key'
    );
  });

  test('test User model with duplicate user name', async () => {
    const inputData = {
      username: userEmail,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      name: faker.name.fullName(),
    };
    expect(async () => new User(inputData).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.users index: username_1 dup key'
    );
  });
});
