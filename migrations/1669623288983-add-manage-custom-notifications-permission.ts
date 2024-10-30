import { Permission } from '@models/permission.model';
import { logger } from '@services/logger.service';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

/** Migration description */
export const description = 'Add manage notifications permission';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const type = 'can_manage_custom_notifications';

  // check if permission already exists
  const permissionExists = await Permission.exists({ type, global: false });
  if (permissionExists) {
    logger.info(`${type} permission already exists`);
    return;
  }

  const permission = new Permission({
    type,
    global: false,
  });
  await permission.save();
  logger.info(`${type} application's permission created`);
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
