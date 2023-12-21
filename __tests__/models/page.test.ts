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

let dashboardId;

/**
 * Test Page Model.
 */
beforeAll(async () => {
  const dashboard = await new Dashboard({
    name: faker.word.adjective(),
  }).save();
  console.log(dashboard);
  dashboardId = dashboard._id;

  await new Workflow({
    name: faker.random.alpha(10),
  }).save();

  const formName = faker.word.adjective();

  console.log('executing');

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
      const saveData = await new Page({
        name: name,
        type: contentType.dashboard,
        content: dashboardId,
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
        type: contentType.workflow,
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
    const page = await new Page({
      name: faker.word.adjective(),
      type: contentType.dashboard,
      content: dashboardId,
    }).save();

    await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: [page._id],
    }).save();

    const isDelete = await Page.deleteOne({ _id: page._id });
    expect(isDelete.acknowledged).toEqual(true);
    expect(isDelete.deletedCount).toEqual(1);
  });

  test('test page delete with workflow', async () => {
    const workflow = await Workflow.findOne();

    const page = await new Page({
      name: faker.word.adjective(),
      type: contentType.workflow,
      content: workflow._id,
    }).save();

    await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: [page._id],
    }).save();

    const isDelete = await Page.deleteOne({ _id: page._id });
    expect(isDelete.acknowledged).toEqual(true);
    expect(isDelete.deletedCount).toEqual(1);
  });
});

test('test with archived set to true', async () => {
  const saveData = await new Page({
    name: faker.word.adjective(),
    type: contentType.dashboard,
    content: dashboardId,
    archived: true,
  }).save();
  expect(saveData.archived).toEqual(true);
});

test('test with archived set to false', async () => {
  const saveData = await new Page({
    name: faker.word.adjective(),
    type: contentType.dashboard,
    content: dashboardId,
    archived: false,
  }).save();
  expect(saveData.archived).toEqual(false);
});

test('test with archivedAt set', async () => {
  const archivedAt = new Date();
  const saveData = await new Page({
    name: faker.word.adjective(),
    type: contentType.dashboard,
    content: dashboardId,
    archivedAt: archivedAt,
  }).save();
  expect(saveData.archivedAt).toEqual(archivedAt);
});

test('should update workflow when page is updated with archived flag', async () => {
  // Create a workflow
  const workflow = await new Workflow({
    name: 'Test Workflow',
  }).save();

  // Create a page with the workflow
  const page = await new Page({
    name: 'Test Page',
    type: contentType.workflow,
    content: workflow._id,
  }).save();

  // Update the page with the archived flag
  const updatedPage = await Page.findOneAndUpdate(
    { _id: page._id },
    { archived: true, archivedAt: new Date() },
    { new: true }
  );

  // Retrieve the updated workflow
  const updatedWorkflow = await Workflow.findById(page.content);

  // Check if the workflow is updated based on the archived flag
  expect(updatedWorkflow.archived).toEqual(true);
  expect(updatedWorkflow.archivedAt).toEqual(updatedPage.archivedAt);
});

test('should update dashboard and related dashboards when page is updated with archived flag', async () => {
  // Create a page with the dashboard and related dashboards
  const page = await new Page({
    name: 'Test Page',
    type: contentType.dashboard,
    content: dashboardId,
    contentWithContext: [
      {
        content: dashboardId,
      },
      // Add more related dashboards if needed
    ],
  }).save();

  // Update the page with the archived flag
  const updatedPage = await Page.findOneAndUpdate(
    { _id: page._id },
    { archived: true, archivedAt: new Date() },
    { new: true }
  );

  console.log(await Dashboard.findOne());

  // Retrieve the updated dashboard
  const updatedDashboard = await Dashboard.findById(page.content);

  // Check if the dashboard is updated based on the archived flag
  expect(updatedDashboard.archived).toEqual(true);
  expect(updatedDashboard.archivedAt).toEqual(updatedPage.archivedAt);

  // Retrieve the related dashboards
  const relatedDashboards = await Dashboard.find({
    _id: { $in: page.contentWithContext.map((item) => item.content) },
  });

  // Check if related dashboards are updated based on the archived flag
  relatedDashboards.forEach((relatedDashboard) => {
    expect(relatedDashboard.archived).toEqual(true);
    expect(relatedDashboard.archivedAt).toEqual(updatedPage.archivedAt);
  });
});
