import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

startDatabaseForMigration();

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  /*
      Code your update script here!
   */
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
