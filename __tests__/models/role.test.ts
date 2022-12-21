import { Role, Application, Channel } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Role Model.
 */
describe('Role models tests', () => {
  test('test Role model with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const application = await new Application({
        name: faker.internet.userName(),
        status: status.pending,
      }).save();

      const channelList = await Channel.find().limit(10);
      const channels = channelList.map((channel) => {
        return channel._id;
      });

      const inputData = {
        title: faker.random.alpha(10),
        description: faker.commerce.productDescription(),
        application: application._id,
        channels: channels,
      };

      const saveData = await new Role(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test Role model with wrong title', async () => {
    const inputData = {
      title: faker.science.unit(),
      description: faker.commerce.productDescription(),
    };

    expect(async () => new Role(inputData).save()).rejects.toThrow(Error);
  });
});
