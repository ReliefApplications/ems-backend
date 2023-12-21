import { SafeServer } from './server';
import mongoose from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import customNotificationScheduler from './server/customNotificationScheduler';
import { startDatabase } from './server/database';
import config from 'config';
import { logger } from './services/logger.service';
import { checkConfig } from '@utils/server/checkConfig.util';
import buildSchema from '@utils/schema/buildSchema';
import { mergeWhoConfigs } from '@utils/server/mergeWhoConfigs';

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

// Merge configs from who-XXX.js to who.js and override the default config with the result
mergeWhoConfigs()
  .then(() => {
    // Ensure that all mandatory keys exist
    checkConfig();

    /** SafeServer server port */
    const PORT = config.get('server.port');

    startDatabase();
    mongoose.connection.once('open', () => {
      logger.log({ level: 'info', message: '📶 Connected to database' });
      subscriberSafe();
      pullJobScheduler();
      customNotificationScheduler();
    });

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
    launchServer();
  })
  .catch((err) => {
    logger.error(err);
  });
