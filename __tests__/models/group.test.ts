import { Group } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Group Model.
 */
describe('Group models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const group = await new Group({
        title: faker.random.alpha(10),
        description: faker.commerce.productDescription(),
        oid: faker.datatype.uuid(),
      }).save();
      expect(group._id).toBeDefined();
      expect(group).toHaveProperty('createdAt');
      expect(group).toHaveProperty('modifiedAt');
    }
  });

  test('test with blank channel name field', async () => {
    const groupData = {
      title: faker.science.unit(),
      description: faker.commerce.productDescription(),
      oid: faker.datatype.uuid(),
    };
    expect(async () => new Group(groupData).save()).rejects.toThrow(Error);
  });
});
