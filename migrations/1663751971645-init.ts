import { startDatabase } from '../src/utils/migrations/database.helper';
import { initDatabase } from '../src/server/database';

startDatabase();

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
