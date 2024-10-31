import { Resource } from '@models/resource.model';
import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { cloneDeep, omit } from 'lodash';
import { logger } from '@services/logger.service';

/** Migration description */
export const description = 'Create new download records permission';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find().select('permissions');
  const bulkUpdate = [];
  for (const resource of resources) {
    const canSeeRecords = resource.permissions.canSeeRecords;
    if (canSeeRecords && canSeeRecords.length > 0) {
      const canDownloadRecords = cloneDeep(canSeeRecords).map((x) =>
        omit(x.toObject(), ['access'])
      );
      const permissions = {
        ...resource.permissions,
        canDownloadRecords,
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

  try {
    logger.info('Updating resources with the new download permission');
    await Resource.bulkWrite(bulkUpdate);
    //  await Promise.all(resources.map((resource) => resource.save()));
  } catch (e) {
    logger.error('Error trying to save new download permission type: ', e);
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
