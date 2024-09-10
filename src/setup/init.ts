import mongoose from 'mongoose';
import { initDatabase, startDatabase } from '../server/database';
import logger from '@lib/logger';

// Start database and init, uploading default records
startDatabase();
mongoose.connection.once('open', async () => {
  await initDatabase();
  await mongoose.connection.close();
  logger.info('connection closed');
});
