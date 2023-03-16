import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { initDatabase } from '../src/server/database';

/**
 * Use to init migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  try {
    await initDatabase();
  } catch (err) {
    throw err;
  }
};

/**
 * Use to init migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
