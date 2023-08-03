import { Dashboard, Form, Resource } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@services/logger.service';

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

/** Updates forms to work with new sort structure */
const updateForms = async () => {
  logger.info('Updating sort structure, looking for forms to update...');
  const updates: any = [];
  const forms = await Form.find({});

  for (const form of forms) {
    const updatedSorts = {};
    const fields = form.fields ?? [];
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
          filter: { _id: form._id },
          update: {
            $set: updatedSorts,
          },
        },
      });
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
  const resources = [await Resource.findById('64ca94bc649dfbf72608c59d')];

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
