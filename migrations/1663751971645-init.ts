import { getDb } from '../migrations-utils/db';
import { initDatabase } from '../src/server/database';

getDb();

/**
 * Use to init migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await initDatabase();
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
