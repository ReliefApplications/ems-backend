import {
  startDatabase,
  initDatabase,
  stopDatabase,
} from '../src/server/database';
import config from 'config';

/** Executes before all tests */
export default async () => {
  if (config.util.getEnv('NODE_ENV') !== 'production') {
    await startDatabase();
    await initDatabase();
    await stopDatabase();
  }
};
