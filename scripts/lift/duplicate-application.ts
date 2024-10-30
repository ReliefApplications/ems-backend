#!/usr/bin/env node
/* eslint-disable @typescript-eslint/naming-convention */
import minimist from 'minimist';
import {
  Application,
  Dashboard,
  Form,
  Page,
  ReferenceData,
  Resource,
  Role,
  Step,
  Workflow,
} from '@models';
import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { logger } from '@lib/logger';
import { handleRelatedNames } from '@schema/mutation/duplicateResource.mutation';
import { Types } from 'mongoose';
import axios from 'axios';
import config from 'config';
import { pluralize } from 'inflection';
import { getGraphQLTypeName } from '@utils/validators';

/**
 * Command:
 * - Typescript: npx ts-node -r tsconfig-paths/register -r dotenv/config scripts/lift/duplicate-application.ts --app=<BASE_APP_ID> --country=<COUNTRY_NAME> --token=<BEARER_TOKEN>
 * - Javascript: node build/scripts/lift/duplicate-application --app=<BASE_APP_ID> --country=<COUNTRY_NAME> --token=<BEARER_TOKEN>
 * Arguments:
 * --app ( optional ), shortcut: -a
 * --country ( required ), shortcut: -c
 * --token ( required ), shortcut: -t
 */

/** Parsed command-line arguments, using minimist */
const args = minimist(process.argv.slice(2), {
  string: ['app', 'country', 'token'],
  alias: {
    app: 'a',
    country: 'c', // Use "" if country name includes space
    token: 't',
  },
});

/** Default application to use for duplication */
const DEFAULT_APP = '64ccb80356774f7aa3f6861b';
/** Default resource prefix */
const DEFAULT_RESOURCE_PREFIX = 'Standard - ';
/** Application to copy */
const BASE_APP = (args.app as string) || DEFAULT_APP;
/** Country name to duplicate */
const COUNTRY_NAME = (args.country as string) || '';
/** Authentication Bearer */
const auth = args.token ? `Bearer ${args.token as string}` : '';
/** Resource prefix */
let BASE_RESOURCE_PREFIX = DEFAULT_RESOURCE_PREFIX;
/** New resource prefix */
const RESOURCE_PREFIX = `${COUNTRY_NAME} - `;
/** Reference data to duplicate */
let BASE_REF_DATA: ReferenceData[] = [];
/** New reference data */
let REF_DATA: ReferenceData[] = [];
/** Resources to duplicate */
let BASE_RESOURCES: Resource[] = [];
/** Callbacks to execute after application duplication */
const FORM_CALLBACKS: (() => Promise<void>)[] = [];

// Validate inputs
if (!BASE_APP || !COUNTRY_NAME || !auth) {
  console.error(
    `Usage:
      - Javascript: node duplicateBaseApp.ts --app=<BASE_APP_ID> --country=<COUNTRY_NAME> --token=<BEARER_TOKEN>
      - Typescript: npx ts-node -r tsconfig-paths/register -r dotenv/config duplicate-application.ts --app=<BASE_APP_ID> --country=<COUNTRY_NAME> --token=<BEARER_TOKEN>`
  );
  process.exit(1);
}

/** Map between base Ids and new Ids ( entity agnostic ) */
const substituteMap = new Map<string, string>();

/**
 * Substitute in an object base Ids with new Ids
 *
 * @param obj Object to execute the substitution on
 * @returns Updated object.
 */
const substitute = (obj: { [key: string]: any } | string) => {
  let strResource = typeof obj === 'string' ? obj : JSON.stringify(obj);

  for (const [oldId, newId] of substituteMap) {
    const regex = new RegExp(oldId, 'g');
    strResource = strResource.replace(regex, newId);
  }
  return JSON.parse(strResource);
};

/**
 * Duplicate a resource
 *
 * @param resource Base resource
 * @returns New resource & callback method
 */
const duplicateResource = async (resource: Resource) => {
  // Get new one replacing prefix, with country
  const name = resource.name.replace(BASE_RESOURCE_PREFIX, RESOURCE_PREFIX);
  logger.info(`Creating resource: ${name}...`);

  // Replace Ref Data IDs in resource with new ones.
  const newResourceJSON = substitute(resource.toJSON());
  // GraphQL Type name for layout queries
  const pluralGraphQLTypeName = `all${pluralize(getGraphQLTypeName(name))}`;

  // Duplicate resource replacing IDs with new ones.
  const newResource = new Resource({
    name,
    permissions: newResourceJSON.permissions,
    fields: newResourceJSON.fields,
    layouts: newResourceJSON.layouts.map((layout) => {
      if (layout?.query?.name) {
        return {
          ...layout,
          query: {
            ...layout.query,
            name: pluralGraphQLTypeName,
          },
        };
      }
      return layout;
    }),
    aggregations: newResourceJSON.aggregations,
  });

  // Fix relations in the resource
  handleRelatedNames(newResource);
  await newResource.save();

  // Add new resource id to the map
  substituteMap.set(resource._id.toString(), newResource._id.toString());

  const forms = await Form.find({ resource: resource._id });
  const newForms: Form[] = [];

  for (const form of forms) {
    // Get new one replacing prefix, with country
    const newFormName = form.name.replace(
      BASE_RESOURCE_PREFIX,
      RESOURCE_PREFIX
    );
    // Replace Ref Data IDs in resource with new ones.
    const newFormJSON = substitute(form.toJSON());
    // Duplicate form replacing IDs with new ones.
    const newForm = new Form({
      name: newFormName,
      graphQLTypeName: Form.getGraphQLTypeName(newFormName),
      core: newFormJSON.core,
      status: newFormJSON.status,
      permissions: newFormJSON.permissions,
      resource: newResource._id,
      fields: newFormJSON.fields,
      layouts: newFormJSON.layouts,
      structure: newFormJSON.structure,
      createdAt: new Date(),
    });
    newForm.channel.push(newForm._id);

    // Fix relations in the resource
    handleRelatedNames(newForm);

    await Form.create(newForm);
    newForms.push(newForm);

    // Add new form id to the map
    substituteMap.set(form._id.toString(), newForm._id.toString());
  }

  return {
    resource: newResource,
    updateStructure: async () => {
      for (const form of newForms) {
        form.structure = JSON.stringify(substitute(form.structure));
      }
      await Form.bulkSave(newForms);
    },
  };
};

/**
 * Duplicate base reference data to create country specific ones.
 */
const duplicateRefData = async () => {
  // Fetch reference data related to base application
  BASE_REF_DATA = await ReferenceData.find({
    name: {
      $regex: `^${BASE_RESOURCE_PREFIX}`,
      $options: 'i',
    },
  });

  // Throw error if no reference data found
  if (BASE_REF_DATA.length === 0) {
    logger.error('Base reference data not found');
    process.exit(1);
  }

  logger.info(`Creating reference data for ${COUNTRY_NAME}...`);

  // Generate the reference data
  REF_DATA = await ReferenceData.insertMany(
    BASE_REF_DATA.map((refData) => {
      const name = refData.name.replace(BASE_RESOURCE_PREFIX, RESOURCE_PREFIX);
      const newRefData = {
        ...refData.toJSON(),
        name,
        graphQLTypeName: ReferenceData.getGraphQLTypeName(name),
      };
      delete (newRefData as any)._id;

      return new ReferenceData(newRefData);
    })
  );

  // Add elements to substitute map
  for (const refData of BASE_REF_DATA) {
    const newRefData = REF_DATA.find(
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      (x) =>
        refData.name.replace(BASE_RESOURCE_PREFIX, RESOURCE_PREFIX) === x.name
    );
    substituteMap.set(refData._id.toString(), newRefData._id.toString());
  }
};

/**
 * Duplicate base resources to create country specific ones
 */
const duplicateResources = async () => {
  // Fetch resources related to base application
  BASE_RESOURCES = await Resource.find({
    name: {
      $regex: `^${BASE_RESOURCE_PREFIX}`,
      $options: 'i',
    },
  });

  // Throw error if no resource found
  if (BASE_RESOURCES.length === 0) {
    logger.error('Base resources not found');
    process.exit(1);
  }

  for (const resource of BASE_RESOURCES) {
    const { updateStructure } = await duplicateResource(resource);
    FORM_CALLBACKS.push(updateStructure);
  }
};

/**
 * Update application content after its creation
 *
 * @param view Page or Step from the application
 */
const updateContent = async (view: Page | Step) => {
  // Check view id
  if (view.content?.toString().length !== 24) {
    logger.error('Content is invalid, skipping');
    logger.error(JSON.stringify(view));
    process.exit(1);
  }

  const viewType = view.type;
  logger.info(`Substituting page ${view.name} of type ${viewType}...`);

  switch (viewType) {
    case 'form': {
      // If form, replace the form id with the new form id
      view.content = new Types.ObjectId(
        substituteMap.get(view.content.toString())
      );
      await view.save();
      break;
    }
    case 'dashboard': {
      // If dashboard, replace all Ids with new Ids
      const dashboard = await Dashboard.findById(view.content);
      if (!dashboard) return;
      dashboard.structure = substitute(dashboard.structure);
      await dashboard.save();
      break;
    }
    case 'workflow': {
      // if workflow, loop on the steps
      const workflow = await Workflow.findById(view.content);
      if (!workflow) {
        logger.error('Workflow not found');
        process.exit(1);
      }

      const steps = await Step.find({ _id: { $in: workflow.steps } });
      for (const step of steps) {
        await updateContent(step);
      }
      break;
    }
    default:
      break;
  }
};

/**
 * Duplicate application
 */
const duplicateApplication = async () => {
  // Get new application name, indicating country
  const name = `ECMS Labour inspectorate - ${COUNTRY_NAME}`;
  logger.info(`Creating application: ${name}...`);
  // Execute request on server to duplicate application
  const res: any = await new Promise((resolve) => {
    axios({
      url: `${config.get('server.url')}/graphql`,
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      data: {
        query: `mutation duplicateApplication($name: String!, $application: ID!) {
            duplicateApplication(name: $name, application: $application) {
              id
              name
            }
          }`,
        variables: {
          name,
          application: BASE_APP,
        },
      },
    })
      .then((r) => resolve(r))
      .catch((err) => {
        logger.error('Error duplicating application');
        logger.error(JSON.stringify(err.response.data));
        resolve(null);
      });
  });

  // Exit if error on application duplication
  if (!res || res.data.errors) {
    logger.error('Error duplicating application');
    process.exit(1);
  }

  const newApp = await Application.findById(
    res.data.data.duplicateApplication.id
  ).populate({
    path: 'pages',
    model: 'Page',
  });

  if (!newApp) {
    logger.error('Could not find new application');
    return;
  }

  logger.info(
    `Successfully created application ${name} with id ${newApp._id.toString()}`
  );

  // Add new application id to the map
  substituteMap.set(BASE_APP, newApp._id.toString());

  logger.info('Fetching roles...');
  // Get roles from base app
  const baseRoles = await Role.find({
    application: BASE_APP,
  });

  // Get roles from new app
  const newRoles = await Role.find({
    application: newApp._id.toString(),
  });

  for (const baseRole of baseRoles) {
    const newRole = newRoles.find((r) => r.title === baseRole.title);
    // Add new role id to the map
    substituteMap.set(baseRole.id, newRole.id);
  }

  console.log(substituteMap);

  logger.info('Executing form callbacks...');

  // Execute form callbacks
  for (const cb of FORM_CALLBACKS) {
    await cb();
  }

  // Update new pages
  for (const page of newApp.pages as Page[]) {
    await updateContent(page);
  }
};

/**
 * Main script function
 *
 * @returns Should exit with error code if script failed, or silently if succeed.
 */
const main = async () => {
  // Start database
  await startDatabaseForMigration();

  // Get application to duplicate
  const app = await Application.findById(BASE_APP);
  if (!app) {
    // Exit script if no application
    logger.error('Base application not found');
    process.exit(1);
  }

  // Get prefix from application
  if (BASE_APP !== DEFAULT_APP) {
    // Find country of application to duplicate
    if (!app.name) {
      // Application name is not valid
      logger.error('Base application name is invalid');
      process.exit(1);
    }
    const searchString = 'ECMS Labour inspectorate - ';
    BASE_RESOURCE_PREFIX = `${app.name.replace(searchString, '')} - `;
  }

  // Generate new reference data
  await duplicateRefData();

  // Generate new resources
  await duplicateResources();

  // Sleep for some time, to let time to the server to restart
  logger.info('Sleeping for one minute...');
  await new Promise((resolve) => setTimeout(resolve, 60000));
  logger.info('Waking up...');

  // Generate new application
  await duplicateApplication();

  logger.info(
    `Successfully duplicated application ${app.name} with id ${BASE_APP}`
  );
  process.exit(0);
};

main();
