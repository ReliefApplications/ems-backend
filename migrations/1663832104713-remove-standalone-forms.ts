import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { isArray } from 'lodash';
import { Form, Resource, Dashboard, Record } from '../src/models';
import { logger } from '@lib/logger';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  // getting forms not linked to resources
  const standaloneForms = await Form.find({ resource: { $exists: false } });

  // gets conflicting resource by name
  const conflictingResources = (
    await Resource.find({
      name: { $in: standaloneForms.map((x) => x.name) },
    })
  ).map((x) => x.name);

  // deals with name conflicts
  const forms = standaloneForms.filter((f) => {
    if (conflictingResources.includes(f.name)) {
      logger.error(
        `Error migrating form ${f.name}: Resource with same name already exists`
      );
      return false;
    }
    return true;
  });

  if (forms.length === 0) {
    logger.info('No forms to migrate');
    return;
  }

  // creates new resources from the filtered forms
  const newResources = forms.map(
    (form) =>
      new Resource({
        name: form.name,
        fields: form.fields,
        permissions: {
          canSee: form.permissions.canSee,
          canUpdate: form.permissions.canUpdate,
          canDelete: form.permissions.canDelete,
        },
        layouts: form.layouts,
      })
  );

  const resources = await Resource.insertMany(newResources);
  logger.info(
    `\nCreated resources: ${resources.map((x) => x.name).join(', ')}`
  );
  const dashboards = await Dashboard.find();

  // add resource id to forms and all its records
  for (const form of forms) {
    const resourceID = resources.find((r) => r.name === form.name)._id;

    await Form.updateOne(
      { _id: form._id },
      {
        $set: {
          resource: resourceID,
          layouts: [],
          core: true,
        },
      }
    );
    logger.info(`\nLinked resource in ${form.name} form and removed layouts`);
    await Record.updateMany({ form: form._id }, { resource: resourceID });
    logger.info(`Linked resource in all of ${form.name} form's records`);

    for (const dashboard of dashboards) {
      if (dashboard.structure && isArray(dashboard.structure)) {
        let updated = false;
        for (const widget of dashboard.structure) {
          if (
            widget &&
            widget.component === 'grid' &&
            widget.settings?.resource == form._id
          ) {
            widget.settings.resource = resourceID;
            updated = true;
          }
        }
        if (updated) {
          await Dashboard.findByIdAndUpdate(dashboard.id, {
            modifiedAt: new Date(),
            structure: dashboard.structure,
          });
        }
      }
    }
    logger.info(`Updated grid widgets linked to ${form.name} form`);
  }
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
