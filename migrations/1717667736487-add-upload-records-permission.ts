import { Resource } from '@models/resource.model';
import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { cloneDeep, omit } from 'lodash';
import { logger } from '@services/logger.service';

/** Migration description */
export const description = 'Create new upload records permission';

/**
 * up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find().select('permissions');
  const bulkUpdate = [];
  for (const resource of resources) {
    const canCreateRecords = resource.permissions?.canCreateRecords;
    if (canCreateRecords && canCreateRecords.length > 0) {
      const canUploadRecords = cloneDeep(canCreateRecords).map((x) =>
        omit(x.toObject(), ['access'])
      );
      const permissions = {
        ...resource.permissions,
        canUploadRecords,
      };
      bulkUpdate.push({
        updateOne: {
          filter: { _id: resource._id },
          update: {
            permissions,
          },
        },
      });
    }
  }

  if (bulkUpdate.length > 0) {
    try {
      logger.info('Updating resources with the new upload permission');
      await Resource.bulkWrite(bulkUpdate);
    } catch (e) {
      logger.error('Error trying to save new upload permission type: ', e);
    }
  }
};

/**
 * down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  // no-op
};
