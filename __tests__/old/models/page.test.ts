import {
  Dashboard,
  Form,
  Page,
  Application,
  Workflow,
  Resource,
} from '@models';
import { faker } from '@faker-js/faker';
import { contentType, status } from '@const/enumTypes';

/**
 * Test Page Model.
 */

beforeAll(async () => {
  await new Dashboard({
    name: faker.word.adjective(),
  }).save();

  await new Workflow({
    name: faker.random.alpha(10),
  }).save();

  const formName = faker.word.adjective();

  const resource = await new Resource({
    name: formName,
  }).save();

  await new Form({
    name: formName,
    graphQLTypeName: formName,
    status: status.pending,
    resource: resource._id,
  }).save();
});

describe('Page models tests', () => {
  let name = '';
  test('test with correct data and with dashboard as a content', async () => {
    for (let i = 0; i < 1; i++) {
      name = faker.word.adjective();
      const dashboard = await Dashboard.findOne();
      const saveData = await new Page({
        name: name,
        type: contentType.dashboard,
        content: dashboard._id,
      }).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test with correct data and with form as a content', async () => {
    for (let i = 0; i < 1; i++) {
      const form = await Form.findOne();
      const saveData = await new Page({
        name: faker.word.adjective(),
        type: contentType.form,
        content: form._id,
      }).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test with correct data and with workflow as a content', async () => {
    for (let i = 0; i < 1; i++) {
      const workflow = await Workflow.findOne();
      const saveData = await new Page({
        name: faker.word.adjective(),
        type: contentType.form,
        content: workflow._id,
      }).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test with content field blank', async () => {
    for (let i = 0; i < 1; i++) {
      const pageInput = {
        name: faker.word.adjective(),
        type: contentType.form,
      };
      const saveData = await new Page(pageInput).save();
      expect(saveData._id).toBeDefined();
      expect(saveData).toHaveProperty('createdAt');
      expect(saveData).toHaveProperty('modifiedAt');
    }
  });

  test('test page with duplicate name', async () => {
    const saveData = await new Page({
      name: name,
      type: contentType.dashboard,
    }).save();
    expect(saveData._id).toBeDefined();
    expect(saveData).toHaveProperty('createdAt');
    expect(saveData).toHaveProperty('modifiedAt');
  });

  test('test with page name as a object and content field blank', async () => {
    for (let i = 0; i < 1; i++) {
      const pageInput = {
        name: faker.science.unit(),
        type: contentType.form,
      };
      expect(async () => new Page(pageInput).save()).rejects.toThrow(Error);
    }
  });

  test('test page delete with dashboard', async () => {
    const dashboard = await Dashboard.findOne();

    const page = await new Page({
      name: faker.word.adjective(),
      type: contentType.form,
      content: dashboard._id,
    }).save();

    await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: [page._id],
    }).save();

    const isDelete = await Page.deleteOne({ _id: page._id });
    expect(isDelete.ok).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });

  test('test page delete with workflow', async () => {
    const workflow = await Workflow.findOne();

    const page = await new Page({
      name: faker.word.adjective(),
      type: contentType.form,
      content: workflow._id,
    }).save();

    await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: [page._id],
    }).save();

    const isDelete = await Page.deleteOne({ _id: page._id });
    expect(isDelete.ok).toEqual(1);
    expect(isDelete.deletedCount).toEqual(1);
  });
});
