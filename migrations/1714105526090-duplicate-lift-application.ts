import {
  Application,
  Dashboard,
  Form,
  Page,
  ReferenceData,
  Resource,
  Step,
  Workflow,
} from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '../src/services/logger.service';
import { handleRelatedNames } from '@schema/mutation/duplicateResource.mutation';
import { Types } from 'mongoose';
import axios from 'axios';
import config from 'config';
import { pluralize } from 'inflection';
import { getGraphQLTypeName } from '@utils/validators';

// This migration duplicates the base app for a new country
//
// In order to run it, fill the auth and COUNTRY_NAME variables with the appropriate values
// After that, two steps need to be taken manually:
//   1. Make any changes to the Proactive and Register a complaint forms (e.g. the description) and save them
//   2. Copy the custom styling of the base app to the new one

/** Use your own bearer token when running this */
const auth =
  'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJQa2tSMjhVUl9qUDFmT3loS1ktMG1PU1lwZ19hR3p6c0cyczdhc3YyelNBIn0.eyJleHAiOjE3MjIzNjMwMTUsImlhdCI6MTcyMjM1OTQxNSwiYXV0aF90aW1lIjoxNzIyMzU5NDEzLCJqdGkiOiI5YTUzY2Q3YS0xYjdjLTRmNzctYjgzOC0xNjA3NmNhMjhmNWIiLCJpc3MiOiJodHRwczovL2lkLWxpZnQub29ydGNsb3VkLnRlY2gvYXV0aC9yZWFsbXMvb29ydCIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiIxYTA5MmIxOS0zODg4LTQ3MDMtODk1Ny0yZWFkMWU4NWE3OWQiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJvb3J0LWNsaWVudCIsIm5vbmNlIjoiVFdNek5XNW9UbEExV1RkMWRVRXdkVGg1TVVGWmREQjNaMTlRYlZwUmJWWndNbEo2WVhKbFZHcExlSGhZIiwic2Vzc2lvbl9zdGF0ZSI6ImFhMmQxNzRlLTI3MjQtNGJiYS04MmEyLTk1NmRjZDJjMzFhNyIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cHM6Ly9saWZ0Lm9vcnRjbG91ZC50ZWNoIiwiaHR0cDovL2xvY2FsaG9zdDo0MjAwIiwiaHR0cDovL2xvY2FsaG9zdDozMDAwIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsImRlZmF1bHQtcm9sZXMtb29ydCIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgb2ZmbGluZV9hY2Nlc3MgcHJvZmlsZSBlbWFpbCIsInNpZCI6ImFhMmQxNzRlLTI3MjQtNGJiYS04MmEyLTk1NmRjZDJjMzFhNyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiTWF0aGV1cyBEaWFzIiwicHJlZmVycmVkX3VzZXJuYW1lIjoibWF0aGV1cy5yZWxpZWZhcHBzQGdtYWlsLmNvbSIsImdpdmVuX25hbWUiOiJNYXRoZXVzIiwiZmFtaWx5X25hbWUiOiJEaWFzIiwiZW1haWwiOiJtYXRoZXVzLnJlbGllZmFwcHNAZ21haWwuY29tIn0.JuLG56i45zTJJoWsAX3TNOLwNzvglFjBtFEBxXWatr5IU0_K5j-xsLVKcB3h5pxpTE8hruzzwvnis8unGayGpuYW-43EzcU36qcHYPsT-kSf6jjh4rQ4PoKIiRl1n9hJScChYAiqbxfU9qbra0TjVdQqRxm9TdkUUHLYzSdPtRA8DXqS1h8p1O1Ye6hP_qHDQhD3xLgwMSDNG2qmI216ESHQm1ueWwxhEEVddcQ0EyurHZAHYQX-ObqB7otfXItjz-R4wR2Lz8zXUgU1V8bXDoSJSabZCiioL-ADFSsHe4dWsohnw7-zhuzlWSkRNBYnrLX7etjR9KQbopbw8fgkRw';
/** Name of the new country to duplicate base app from */
const COUNTRY_NAME = 'ABrazil9';

/** ID of the base app to be copied */
const BASE_APP = '64ccb80356774f7aa3f6861b';

/** IDs of the resources to be copied */
const RESOURCES_IDS = [
  ['Campaign', '650c29939736b66fb72ebf15'],
  ['Staff', '6410a55f6fc5b03b44915b84'],
  ['Documents library', '646b3149c9c167ec20bdda7e'],
  ['Enterprise registry', '6410afa26fc5b0cc5e91617d'],
  ['Register a complaint', '642c00b46fc5b0622991aa8d'],
] as const;

/** Map of the original id to the new id of all entities */
const idSubstitutionMap = new Map<string, string>();

/**
 * Substitute all occurrences of the old ids with the new ones
 *
 * @param obj Object to be substituted
 * @returns The object with the ids substituted
 */
const substitute = (obj: { [key: string]: any } | string) => {
  let strResource = typeof obj === 'string' ? obj : JSON.stringify(obj);

  // iterate over any id in the map and replace it
  for (const [oldId, newId] of idSubstitutionMap) {
    const regex = new RegExp(oldId, 'g');
    strResource = strResource.replace(regex, newId);
  }
  return JSON.parse(strResource);
};

/**
 * Duplicate a resource and its forms from its id
 *
 * @param resource Resource to be duplicated
 * @returns The duplicated resource
 */
const duplicateResource = async (resource: Resource) => {
  // First we duplicate any reference data that the resource uses
  const refDatasToDuplicate = resource.fields
    .filter(
      // Only duplicates reference data that have not been duplicated yet (not in the map)
      (f) => f.referenceData?.id && !idSubstitutionMap.has(f.referenceData.id)
    )
    .map((f) => f.referenceData.id);

  const refDatas = await ReferenceData.find({
    _id: { $in: refDatasToDuplicate },
  });

  const duplicatedRefDatas = refDatas.map((refData) => {
    const name = refData.name.replace('Standard -', `${COUNTRY_NAME} -`);
    const newRefData = {
      ...refData.toJSON(),
      name,
      graphQLTypeName: ReferenceData.getGraphQLTypeName(name),
    };
    delete newRefData._id;

    return new ReferenceData(newRefData);
  });

  // Save the duplicated reference data
  await ReferenceData.insertMany(duplicatedRefDatas);

  // Add the new ids to the map
  refDatas.forEach((refData, i) => {
    idSubstitutionMap.set(
      refData._id.toString(),
      duplicatedRefDatas[i]._id.toString()
    );
  });

  const resourceName = RESOURCES_IDS.find(
    (r) => r[1] === resource._id.toString()
  )?.[0];
  const newName = `${COUNTRY_NAME} - ${resourceName}`;
  logger.info(`Creating resource: ${newName}...`);

  const newResourceJSON = substitute(resource.toJSON());

  // Duplicate resource with new id
  const duplicatedResource = new Resource({
    name: newName,
    permissions: newResourceJSON.permissions,
    fields: newResourceJSON.fields,
    layouts: newResourceJSON.layouts.map((layout) => {
      if (layout?.query?.name) {
        return {
          ...layout,
          query: {
            ...layout.query,
            name: `all${pluralize(getGraphQLTypeName(newName))}`,
          },
        };
      }

      return layout;
    }),
    aggregations: newResourceJSON.aggregations,
  });

  // Handle related names
  handleRelatedNames(duplicatedResource);

  // Save the duplicated resource
  await duplicatedResource.save();

  // Add the new id to the map
  idSubstitutionMap.set(
    resource._id.toString(),
    duplicatedResource._id.toString()
  );

  // Get all forms with the resource id
  const forms = await Form.find({ resource: resource._id });

  // Duplicate forms with new resource id
  for (const form of forms) {
    // Add the number at the end of the name to make it unique
    const newNameForm = `${COUNTRY_NAME} - ${form.name.split('-')[1].trim()}`;
    const newFormJSON = substitute(form.toJSON());

    const duplicatedForm = new Form({
      name: newNameForm,
      graphQLTypeName: Form.getGraphQLTypeName(newNameForm),
      core: newFormJSON.core,
      status: newFormJSON.status,
      permissions: newFormJSON.permissions,
      resource: duplicatedResource._id,
      fields: newFormJSON.fields,
      layouts: newFormJSON.layouts,
      structure: newFormJSON.structure,
      createdAt: new Date(),
    });
    duplicatedForm.channel.push(duplicatedForm._id);

    // Handle related names
    handleRelatedNames(duplicatedForm);

    await Form.create(duplicatedForm);

    // Add the new id to the map
    idSubstitutionMap.set(form._id.toString(), duplicatedForm._id.toString());
  }

  return duplicatedResource;
};

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  if (!COUNTRY_NAME) {
    logger.error('Please set the COUNTRY_NAME variable');
    return;
  }

  // Check if the user supplied a valid bearer token
  if (!auth || (auth as string) === 'Bearer [...]') {
    logger.error('Please set the auth variable');
    return;
  }

  await startDatabaseForMigration();

  // Check that the app exists
  const app = await Application.findById(BASE_APP);
  if (!app) {
    logger.error('Base application not found');
    return;
  }

  const resourceIDS = RESOURCES_IDS.map((r) => new Types.ObjectId(r[1]));

  // Check that every resource exists
  const resources = await Resource.find({
    _id: { $in: resourceIDS },
  });
  if (resources.length !== Object.values(RESOURCES_IDS).length) {
    logger.info(resources.length);
    logger.info(resources.map((r) => r._id.toString()));
    return;
  }

  // Duplicate each resource
  for (const resource of resources) {
    await duplicateResource(resource);
  }

  // sleep for 5 seconds
  logger.info('Sleeping for 5 seconds');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  logger.info('Waking up');

  // Duplicate the application
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
          name: `ECMS Labour inspectorate - ${COUNTRY_NAME}`,
          application: BASE_APP,
        },
      },
    })
      .then((r) => {
        resolve(r);
      })
      .catch((err) => {
        logger.error('Error duplicating application');
        logger.error(JSON.stringify(err.response.data));
        resolve(null);
      });
  });

  if (res === null) {
    logger.error('Error duplicating application');
    return;
  }

  if (res.data.errors) {
    logger.error('Error duplicating application');
    logger.error(JSON.stringify(res.data.errors));
    return;
  }

  // Add the new id to the map
  idSubstitutionMap.set(BASE_APP, res.data.data.duplicateApplication.id);

  logger.info('Substitution map:');
  logger.info(Object.keys(idSubstitutionMap));

  // Replace resource ids in widget aggregations
  const newApp = await Application.findById(
    res.data.data.duplicateApplication.id
  ).populate({
    path: 'pages',
    model: 'Page',
  });

  const substitutePage = async (page: Page | Step) => {
    if (page.content?.toString().length !== 24) {
      logger.error('Invalid page content!!!');
      logger.error(JSON.stringify(page));
      return;
    }
    const pageType = page.type;
    logger.info(`Substituting page ${page.name} of type ${pageType}`);
    switch (pageType) {
      case 'form': {
        page.content = new Types.ObjectId(
          idSubstitutionMap.get(page.content.toString())
        );
        await page.save();
        break;
      }
      case 'dashboard': {
        const dashboard = await Dashboard.findById(page.content);
        if (!dashboard) {
          return;
        }
        dashboard.structure = substitute(dashboard.structure);
        await dashboard.save();
        break;
      }
      case 'workflow': {
        const workflow = await Workflow.findById(page.content);
        if (!workflow) {
          logger.error('Workflow not found');
          return;
        }

        // get the steps from
        const steps = await Step.find({ _id: { $in: workflow.steps } });
        for (const step of steps) {
          logger.info(`Substituting step ${step.name}`);
          await substitutePage(step);
        }
      }
    }
  };

  for (const page of newApp.pages as Page[]) {
    await substitutePage(page);
  }

  throw new Error('Not implemented');
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
