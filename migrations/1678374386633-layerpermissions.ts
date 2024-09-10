import permissions from '@const/permissions';
import { Permission } from '@models';
import { logger } from '@lib/logger';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const typesToAdd = [permissions.canSeeLayer, permissions.canManageLayer];

  for (const type of typesToAdd) {
    // check if permission already exists
    const permissionExists = await Permission.exists({
      type,
      global: true,
    });
    if (permissionExists) {
      logger.info(`${type} permission already exists`);
      return;
    }

    const permission = new Permission({
      type,
      global: true,
    });
    await permission.save();
    logger.info(`${type} permission created`);
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
