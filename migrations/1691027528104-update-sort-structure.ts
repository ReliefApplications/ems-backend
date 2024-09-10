import { Dashboard, Form, Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@lib/logger';
import { isEqual } from 'lodash';

/** Updates layouts to work with new sort structure */
const updateLayouts = async () => {
  logger.info('Updating sort structure, looking for layouts to update...');
  const updates: any = [];
  const resources = await Resource.find({});

  for (const resource of resources) {
    const updatedSorts = {};
    const layouts = resource.layouts ?? [];
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i];
      const sort = layout?.query?.sort;
      if (!sort || Array.isArray(sort)) continue;
      updatedSorts[`layouts.${i}.query.sort`] = sort.field ? [sort] : [];
    }
    if (Object.keys(updatedSorts).length > 0) {
      updates.push({
        updateOne: {
          filter: { _id: resource._id },
          update: {
            $set: updatedSorts,
          },
        },
      });
    }
  }

  if (updates.length > 0) {
    logger.info(`Updating ${updates.length} resources...`);
    await Resource.bulkWrite(updates);
  } else logger.info('No resources to update.');
};

/** Updates dashboards to work with new sort structure */
const updateDashboards = async () => {
  logger.info('Updating sort structure, looking for dashboards to update...');
  const updates: any = [];
  const dashboards = await Dashboard.find({});

  for (const dashboard of dashboards) {
    const updatedSorts = {};
    const widgets = dashboard.structure ?? [];
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      if (!widget || widget.component !== 'grid') continue;
      const floatingButtons = widget.settings?.floatingButtons ?? [];
      for (let j = 0; j < floatingButtons.length; j++) {
        const floatingButton = floatingButtons[j];
        const sort = floatingButton?.targetFormQuery?.sort;
        if (!sort || Array.isArray(sort)) continue;
        updatedSorts[
          `structure.${i}.settings.floatingButtons.${j}.targetFormQuery.sort`
        ] = sort.field ? [sort] : [];
      }
    }

    if (Object.keys(updatedSorts).length > 0)
      updates.push({
        updateOne: {
          filter: { _id: dashboard._id },
          update: {
            $set: updatedSorts,
          },
        },
      });
  }

  if (updates.length > 0) {
    logger.info(`Updating ${updates.length} dashboards...`);
    await Dashboard.bulkWrite(updates);
  } else logger.info('No dashboards to update.');
};

/**
 * Gets the updated form structure, accounting for multi-sort
 *
 * @param form Form to get updated structure of
 * @returns Updated form structure
 */
const updateFormStructure = (form: Form) => {
  const updateSort = (elements: any) => {
    elements.forEach((question: any) => {
      if (question.elements) {
        // If question is a panel type that has sub-questions
        updateSort(question.elements);
      } else if (question.templateElements) {
        // If question is a paneldynamic type that has sub-questions
        updateSort(question.templateElements);
      } else if (question.gridFieldsSettings) {
        const sort = question.gridFieldsSettings.sort;
        if (!sort || Array.isArray(sort)) return;
        question.gridFieldsSettings.sort = sort.field ? [sort] : [];
      }
    });
  };

  const structure = JSON.parse(form.structure ?? '{"pages": []}');
  structure.pages.forEach((p) => {
    if (p.elements) updateSort(p.elements);
  });

  return JSON.stringify(structure);
};

/** Updates forms to work with new sort structure */
const updateForms = async () => {
  logger.info('Updating sort structure, looking for forms to update...');
  const updates: any = [];
  const forms = await Form.find({});

  for (const form of forms) {
    const updatedSorts: Record<string, any> = {};
    const fields = form.fields ?? [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const sort = field.gridFieldsSettings?.sort;
      if (!sort || Array.isArray(sort)) continue;
      updatedSorts[`fields.${i}.gridFieldsSettings.sort`] = sort.field
        ? [sort]
        : [];
    }

    const updatedStructure = updateFormStructure(form);
    if (
      !isEqual(JSON.parse(form.structure ?? '{}'), JSON.parse(updatedStructure))
    )
      updatedSorts.structure = updatedStructure;

    if (Object.keys(updatedSorts).length > 0) {
      updates.push({
        updateOne: {
          filter: { _id: form._id },
          update: {
            $set: updatedSorts,
          },
        },
      });
    }
  }

  if (updates.length > 0) {
    logger.info(`Updating ${updates.length} forms...`);
    await Form.bulkWrite(updates);
  } else logger.info('No forms to update.');
};

/** Updates resources to work with new sort structure */
const updateResources = async () => {
  logger.info('Updating sort structure, looking for resources to update...');
  const updates: any = [];
  const resources = await Resource.find({});

  for (const resource of resources) {
    const updatedSorts = {};
    const fields = resource.fields ?? [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const sort = field.gridFieldsSettings?.sort;
      if (!sort || Array.isArray(sort)) continue;
      updatedSorts[`fields.${i}.gridFieldsSettings.sort`] = sort.field
        ? [sort]
        : [];
    }

    if (Object.keys(updatedSorts).length > 0)
      updates.push({
        updateOne: {
          filter: { _id: resource._id },
          update: {
            $set: updatedSorts,
          },
        },
      });
  }

  if (updates.length > 0) {
    logger.info(`Updating ${updates.length} resources...`);
    await Resource.bulkWrite(updates);
  } else logger.info('No resources to update.');
};

/** Updates data to be compatible with multi-sorting */
export const up = async () => {
  await startDatabaseForMigration();

  // Migrate layouts
  await updateLayouts();

  // Migrate dashboards
  await updateDashboards();

  // Migrate forms
  await updateForms();

  // Migrate resources
  await updateResources();
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
