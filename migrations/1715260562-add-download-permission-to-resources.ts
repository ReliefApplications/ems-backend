import { logger } from '@services/logger.service';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Resource } from '@models';
import { cloneDeep } from 'lodash';

/**
 * Add to resources the new download permission to the permissions lists of each resource.
 * Duplicates the "see" permissions rules: "see" guarantees "download" & "create" guarantees "see" which guarantees "download".
 */
export const up = async () => {
  await startDatabaseForMigration();
  const resources = await Resource.find();
  for (const resource of resources) {
    const permissions = resource.permissions;

    resource.permissions = {
      ...permissions,
      canDownload: permissions.canSee ? cloneDeep(permissions.canSee) : [],
      canDownloadRecords:
        permissions.canSeeRecords || permissions.canCreateRecords
          ? cloneDeep(permissions.canSeeRecords)
          : [],
    };
  }

  try {
    logger.info('Updating resources with the new download permission');
    await Promise.all(resources.map((resource) => resource.save()));
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
