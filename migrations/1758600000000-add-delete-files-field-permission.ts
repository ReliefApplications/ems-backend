import { Resource } from '@models/resource.model';
import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { logger } from '@services/logger.service';

/** Migration description */
export const description =
  'Create the files deletion field permission, granted to roles allowed to edit the field';

/**
 * Grant the new canDeleteFiles field permission to every role that can update
 * the field, so that existing users keep deleting files in the forms they
 * have access to once a file field allows marking files as outdated.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find().select('fields');
  const bulkUpdate = [];
  for (const resource of resources) {
    let changed = false;
    const fields = (resource.fields || []).map((field: any) => {
      const permissions = field.permissions;
      if (!permissions || permissions.canDeleteFiles) {
        return field;
      }
      changed = true;
      return {
        ...field,
        permissions: {
          ...permissions,
          canDeleteFiles: [...(permissions.canUpdate || [])],
        },
      };
    });
    if (changed) {
      bulkUpdate.push({
        updateOne: {
          filter: { _id: resource._id },
          update: { $set: { fields } },
        },
      });
    }
  }

  if (bulkUpdate.length === 0) {
    logger.info(
      'No resource field to update with the files deletion permission'
    );
    return;
  }
  try {
    logger.info(
      `Updating ${bulkUpdate.length} resource(s) with the files deletion field permission`
    );
    await Resource.bulkWrite(bulkUpdate);
  } catch (e) {
    logger.error(
      'Error trying to save the files deletion field permission: ',
      e
    );
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
