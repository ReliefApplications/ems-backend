import { PullJob, Form, Channel, ApiConfiguration } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test PullJob Model.
 */
describe('PullJob models tests', () => {
  test('test PullJob model with correct data', async () => {
    const apiConfiguration = await new ApiConfiguration({
      name: faker.internet.userName(),
    }).save();
    const formName = faker.random.alpha(10);
    const form = await new Form({
      name: formName,
      graphQLTypeName: formName,
    }).save();
    const channel = await new Channel({
      title: faker.internet.userName(),
    }).save();

    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.word.adjective(),
        status: status.active,
        apiConfiguration: apiConfiguration._id,
        url: faker.internet.url(),
        path: faker.system.directoryPath(),
        schedule: '* * * * *',
        convertTo: form._id,
        channel: channel._id,
      };
      const saveData = await new PullJob(inputData).save();
      expect(saveData._id).toBeDefined();
    }
  });

  test('test PullJob model with wrong status', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.word.adjective(),
        status: faker.word.adjective(),
      };
      expect(async () => new PullJob(inputData).save()).rejects.toThrow(Error);
    }
  });
});
