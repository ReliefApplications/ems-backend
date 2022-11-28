import { Permission } from '@models/permission.model';
import { logger } from '@services/logger.service';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const type = 'can_manage_custom_notifications';
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
