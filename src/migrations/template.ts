import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description = '***';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
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
