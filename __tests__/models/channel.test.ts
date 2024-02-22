import { Channel, Notification } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Channel Model.
 */
describe('Channel models tests', () => {
  let channel;
  test('test with correct data', async () => {
    for (let i = 0; i < 10; i++) {
      channel = await new Channel({
        title: faker.random.alpha(10),
      }).save();
      expect(channel._id).toBeDefined();
    }
  });

  test('test Channel with duplicate title', async () => {
    const duplicateApiConfig = {
      title: channel.title,
    };
    expect(async () => new Channel(duplicateApiConfig).save()).rejects.toThrow(
      'E11000 duplicate key error collection: test.channels index: title_1_application_1_form_1 dup key'
    );
  });

  test('test with blank channel name field', async () => {
    for (let i = 0; i < 1; i++) {
      const channelData = {
        title: '',
      };
      expect(async () => new Channel(channelData).save()).rejects.toThrow(
        Error
      );
    }
  });

  test('test channel delete', async () => {
    const channelData = await new Channel({
      title: faker.random.alpha(10),
    }).save();

    for (let i = 0; i < 10; i++) {
      await new Notification({
        action: 'channel created',
        channel: channelData._id,
      }).save();
    }

    const isDelete = await Channel.deleteOne({ _id: channelData._id });
    expect(isDelete.acknowledged).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
