import mongoose from 'mongoose';
import { initDatabase, startDatabase } from '../server/database';
import { logger } from '../services/logger.service';

// Start database and init, uploading default records
startDatabase();
mongoose.connection.once('open', async () => {
  await initDatabase();
  mongoose.connection.close(() => {
    logger.info('connection closed');
  });
});
