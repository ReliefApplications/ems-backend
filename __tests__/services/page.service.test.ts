import {
  Application,
  Dashboard,
  Form,
  Page,
  Resource,
  Step,
  Workflow,
} from '@models';
import { faker } from '@faker-js/faker';
import { status, contentType } from '@const/enumTypes';
import { duplicatePages, duplicatePage } from '@services/page.service';

/**
 * Test page service function.
 */

let formPage;
let dashboardPage;
let workflowPage;
beforeAll(async () => {
  const formName = faker.random.alpha(10);
  const field1 = faker.word.adjective();
  const field2 = faker.word.adjective();
  const field3 = faker.word.adjective();
  const field4 = faker.word.adjective();
  const field5 = faker.word.adjective();

  const choice1 = faker.word.adjective();
  const choice2 = faker.word.adjective();
  const choice3 = faker.word.adjective();

  const resource = await new Resource({
    name: formName,
    layouts: [
      {
        name: formName,
        query: {
          name: `all${Form.getGraphQLTypeName(formName)}`,
          filter: {
            logic: 'and',
            filters: [
              {
                field: field1,
                operator: 'eq',
                value: 'test',
              },
              {
                field: field2,
                operator: 'contains',
                value: [choice1],
              },
            ],
          },
          pageSize: 10,
          fields: [
            {
              name: field1,
              type: 'String',
              kind: 'SCALAR',
              label: field1,
              format: null,
            },
            {
              name: field2,
              type: 'JSON',
              kind: 'SCALAR',
              label: field2,
              format: null,
            },
            {
              name: field3,
              type: 'String',
              kind: 'SCALAR',
              label: field3,
              format: null,
            },
            {
              name: field4,
              type: 'String',
              kind: 'SCALAR',
              label: field4,
              format: null,
            },
            {
              name: field5,
              type: 'String',
              kind: 'SCALAR',
              label: field5,
              format: null,
            },
          ],
          sort: {
            field: field1,
            order: 'asc',
          },
          style: [],
        },
        display: {
          filter: null,
          fields: null,
          sort: [],
          showFilter: null,
        },
      },
    ],
  }).save();

  const formInput = {
    name: formName,
    graphQLTypeName: Form.getGraphQLTypeName(formName),
    status: status.pending,
    resource: resource._id,
    fields: [
      {
        type: 'text',
        name: field1,
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'checkbox',
        name: field2,
        isRequired: false,
        readOnly: false,
        isCore: true,
        choices: [
          {
            value: choice1,
            text: choice1,
          },
          {
            value: choice2,
            text: choice2,
          },
          {
            value: choice3,
            text: choice3,
          },
        ],
      },
      {
        type: 'radiogroup',
        name: field3,
        isRequired: false,
        readOnly: false,
        isCore: true,
        choices: [
          {
            value: choice1,
            text: choice1,
          },
          {
            value: choice2,
            text: choice2,
          },
          {
            value: choice3,
            text: choice3,
          },
        ],
      },
      {
        type: 'text',
        name: field4,
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
      {
        type: 'text',
        name: field5,
        isRequired: false,
        readOnly: false,
        isCore: true,
      },
    ],
  };

  const form = await new Form(formInput).save();

  // Create Dashboard
  const dashboardInput = {
    name: faker.word.adjective(),
    structure: {
      id: 0,
      name: 'Grid',
      icon: '/assets/grid.svg',
      color: '#AC8CD5',
      settings: {
        id: 0,
        title: 'Grid widget',
        resource: resource._id,
        layouts: resource.layouts.map((x) => x._id),
      },
    },
  };
  const dashboard = await new Dashboard(dashboardInput).save();

  formPage = await new Page({
    name: formName,
    type: contentType.form,
    content: form._id,
  }).save();

  dashboardPage = await new Page({
    name: dashboard.name,
    type: contentType.dashboard,
    content: dashboard._id,
  }).save();

  const step = await new Step({
    name: faker.word.adjective(),
    type: contentType.dashboard,
    content: dashboard._id,
  }).save();

  const workflow = await new Workflow({
    name: faker.word.adjective(),
    steps: [step._id],
  }).save();

  workflowPage = await new Page({
    name: faker.word.adjective(),
    type: contentType.workflow,
    content: workflow._id,
  }).save();
});

describe('Page service tests', () => {
  test('test duplicatePages of page service', async () => {
    const application = await new Application({
      name: faker.random.alpha(10),
      status: status.pending,
      pages: [formPage._id, dashboardPage._id, workflowPage._id],
    }).save();
    const newPermissions = {};
    newPermissions[formPage._id] = formPage._id;
    newPermissions[dashboardPage._id] = dashboardPage._id;
    newPermissions[workflowPage._id] = workflowPage._id;
    const pages = await duplicatePages(application, newPermissions);
    expect(pages).toBeDefined();
  });

  test('test with diff name of form single duplicatePage of page service', async () => {
    const page = await duplicatePage(
      formPage,
      formPage.type,
      faker.random.alpha(10)
    );

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with diff name of dashboard single duplicatePage of page service', async () => {
    const page = await duplicatePage(
      dashboardPage,
      dashboardPage.type,
      faker.random.alpha(10)
    );

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with diff name of workflow single duplicatePage of page service', async () => {
    const page = await duplicatePage(
      workflowPage,
      workflowPage.type,
      faker.random.alpha(10)
    );

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with same name of form single duplicatePage of page service', async () => {
    const page = await duplicatePage(formPage, formPage.type, formPage.name);

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with same name of dashboard single duplicatePage of page service', async () => {
    const page = await duplicatePage(
      dashboardPage,
      dashboardPage.type,
      dashboardPage.name
    );

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with same name of workflow single duplicatePage of page service', async () => {
    const page = await duplicatePage(
      workflowPage,
      workflowPage.type,
      faker.random.alpha(10)
    );

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with diff name of workflow single duplicatePage of page service', async () => {
    const page = await duplicatePage(workflowPage, faker.random.alpha(10));

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with diff name of form single duplicatePage of page service', async () => {
    const page = await duplicatePage(formPage, faker.random.alpha(10));

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });

  test('test with diff name of dashboard single duplicatePage of page service', async () => {
    const page = await duplicatePage(dashboardPage, faker.random.alpha(10));

    expect(page).toBeDefined();
    expect(page).toHaveProperty('createdAt');
    expect(page).toHaveProperty('modifiedAt');
  });
});
