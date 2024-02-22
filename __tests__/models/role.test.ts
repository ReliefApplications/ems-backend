import { Role, Application, Channel } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Role Model.
 */

beforeAll(async () => {
  await new Application({
    name: faker.internet.userName(),
    status: status.pending,
  }).save();
  const channels = [];
  for (let i = 0; i < 10; i++) {
    channels.push({
      title: faker.internet.userName(),
    });
  }
  await Channel.insertMany(channels);
});

describe('Role models tests', () => {
  let role: Role;
  test('test Role model with correct data', async () => {
    const application = await Application.findOne();
    const channelList = await Channel.find().limit(10);
    const channels = channelList.map((channel) => {
      return channel._id;
    });

    for (let i = 0; i < 1; i++) {
      const inputData = {
        title: faker.random.alpha(10),
        description: faker.commerce.productDescription(),
        application: application._id,
        channels: channels,
      };

      role = await new Role(inputData).save();
      expect(role._id).toBeDefined();
    }
  });

  test('test Role with duplicate name and application', async () => {
    const inputData = {
      title: role.title,
      application: role.application,
    };
    expect(async () => new Role(inputData).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.roles index: title_1_application_1 dup key'
    );
  });

  test('test Role model with wrong title', async () => {
    const inputData = {
      title: faker.science.unit(),
      description: faker.commerce.productDescription(),
    };

    expect(async () => new Role(inputData).save()).rejects.toThrow(Error);
  });
});
