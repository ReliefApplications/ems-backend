import { Channel } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Channel Model.
 */
describe('Channel models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const channelData = {
        title: faker.internet.userName(),
      };
      const saveData = await new Channel(channelData).save();
      expect(saveData._id).toBeDefined();
    }
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
});
