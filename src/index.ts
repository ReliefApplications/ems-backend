import { SafeServer } from './server';
import mongoose from 'mongoose';
// import { Record } from '@models';
import pullJobScheduler from './server/pullJobScheduler';
import customNotificationScheduler from './server/customNotificationScheduler';
import { startDatabase } from './server/database';
import config from 'config';
import { logger } from './services/logger.service';
import { checkConfig } from '@utils/server/checkConfig.util';
import buildSchema from '@utils/schema/buildSchema';

// Needed for survey.model, as xmlhttprequest is not defined in servers
global.XMLHttpRequest = require('xhr2');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request interface definition */
    interface Request {
      context: any;
    }
  }
}

// Ensure that all mandatory keys exist
checkConfig();

/** SafeServer server port */
const PORT = config.get('server.port');

/** Starts the server */
const launchServer = async () => {
  const schema = await buildSchema();
  const safeServer = new SafeServer();
  await safeServer.start(schema);
  safeServer.httpServer.listen(PORT, () => {
    logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    logger.info(`🚀 Server ready at ws://localhost:${PORT}/graphql`);
  });
  safeServer.status.on('ready', () => {
    safeServer.httpServer.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
      logger.info(`🚀 Server ready at ws://localhost:${PORT}/graphql`);
    });
  });
};

startDatabase();
mongoose.connection.once('open', async () => {
  logger.log({ level: 'info', message: '📶 Connected to database' });
  // try {
  //   const collection = mongoose.connection.db.collection('records');
  //   await collection.dropIndex('incrementalId_1_resource_1').catch(() => {});
  //   await Record.syncIndexes();
  //   logger.info('✅ Record indexes synced');
  // } catch (e) {
  //   logger.warn(`⚠️ Could not auto-sync Record indexes: ${e?.message || e}`);
  // }
  launchServer();
  // subscriberSafe();
  pullJobScheduler();
  customNotificationScheduler();
});
