import 'tsconfig-paths/register';
import { startDatabase, initDatabase, stopDatabase } from '@server/database';
import config from 'config';
import { logger } from '@lib/logger';

/** Executes before all tests */
export default async () => {
  if (config.util.getEnv('NODE_ENV') !== 'production') {
    await startDatabase();
    logger.log({ level: 'info', message: '📶 Connected to database' });
    await initDatabase();
    await stopDatabase();
  }
};
