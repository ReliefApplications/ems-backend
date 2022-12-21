import { Application, Notification, Channel } from '@models';
import { faker } from '@faker-js/faker';

/**
 * Test Layout Model.
 */
describe('Layout models tests', () => {
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      const application = await Application.findOne();
      const channel = await Channel.findOne();

      const saveData = await new Notification({
        action: 'Application created',
        content: application,
        channel: channel._id,
      }).save();

      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty(['createdAt']);
    }
  });

  test('test with wrong notification action field ', async () => {
    const application = await Application.findOne();
    const channel = await Channel.findOne();

    const saveData = {
      action: faker.science.unit(),
      content: application,
      channel: channel._id,
    };

    expect(async () => new Notification(saveData).save()).rejects.toThrow(
      Error
    );
  });

  test('test notification without channel field ', async () => {
    const application = await Application.findOne();
    const channel = await Channel.findOne();

    const saveData = {
      action: 'Application created',
      content: application,
    };

    expect(async () => new Notification(saveData).save()).rejects.toThrow(
      Error
    );
  });
});
