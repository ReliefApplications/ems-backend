import { Application, Page, Channel } from '@models';
import { status } from '@const/enumTypes';
import { faker } from '@faker-js/faker';

/**
 * Test Application Model.
 */
describe('Application models tests', () => {
  let application: Application;
  test('test with correct data', async () => {
    for (let i = 0; i < 1; i++) {
      application = await new Application({
        name: faker.random.alpha(10),
        status: status.pending,
      }).save();

      expect(application._id).toBeDefined();
      expect(application).toHaveProperty('createdAt');
      expect(application).toHaveProperty('modifiedAt');
    }
  });

  test('test with incorrect application status field', async () => {
    for (let i = 0; i < 1; i++) {
      const inputData = {
        name: faker.random.alpha(10),
        status: faker.datatype.number(),
      };
      expect(async () => new Application(inputData).save()).rejects.toThrow(
        Error
      );
    }
  });

  test('test Application with duplicate name', async () => {
    const duplicateApplication = {
      name: application.name,
    };
    expect(async () =>
      new Application(duplicateApplication).save()
    ).rejects.toThrow(
      'E11000 duplicate key error collection: test.applications index: name_1 dup key'
    );
  });

  test('test application delete', async () => {
    const pages = [];
    for (let i = 0; i < 10; i++) {
      const saveData = await new Page({
        name: faker.word.adjective(),
      }).save();
      pages.push(saveData._id);
    }

    const subscriptions = [];
    for (let i = 0; i < 10; i++) {
      const saveData = await new Channel({
        title: faker.random.alpha(10),
      }).save();
      subscriptions.push({
        title: faker.random.alpha(10),
        channel: saveData._id,
      });
    }

    const applicationData = await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: pages,
      subscriptions: subscriptions,
    }).save();

    const isDelete = await Application.deleteOne({ _id: applicationData._id });
    expect(isDelete.acknowledged).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
