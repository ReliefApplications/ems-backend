import { SafeServer } from './server';
import mongoose from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import customNotificationScheduler from './server/customNotificationScheduler';
import { startDatabase } from './server/database';
import fs from 'fs';
import { mergeSchemas } from 'apollo-server-express';
import { buildSchema, buildTypes } from './utils/schema';
import schema from './schema';
import { GraphQLSchema } from 'graphql';
import config from 'config';
import { logger } from './services/logger.service';
import { checkConfig } from '@utils/server/checkConfig.util';
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

startDatabase();
mongoose.connection.once('open', () => {
  logger.log({ level: 'info', message: '📶 Connected to database' });
  subscriberSafe();
  pullJobScheduler();
  customNotificationScheduler();
});

const Sentry = require("@sentry/node");
const express = require("express");
const app = express();
Sentry.init({
  dsn: "https://da63b46285f94315b2d6f8e9c69d7c8c@o4505563078918144.ingest.sentry.io/4505563106312192",
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
  // For performance monitoring (tracing)
  integrations: [
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({
      app, // to trace all requests to the default router
      // alternatively, you can specify the routes you want to trace:
      // router: someRouter,
    }),
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // Manually add integrations
    new Sentry.Integrations.Mongo(),
  ],
});

/**
 * Gets the GraphQL schema, merging the built schema to the base one, when possible
 *
 * @returns GraphQL schema
 */
const getSchema = async () => {
  try {
    const builtSchema: GraphQLSchema = await buildSchema();
    return mergeSchemas({
      schemas: [schema, builtSchema],
    });
  } catch {
    return schema;
  }
};

/** Starts the server */
const launchServer = async () => {
  const liveSchema = await getSchema();
  const safeServer = new SafeServer();
  await safeServer.start(liveSchema);
  safeServer.httpServer.listen(PORT, () => {
    logger.info(
      `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
    );
    logger.info(
      `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
    );
  });
  safeServer.status.on('ready', () => {
    safeServer.httpServer.listen(PORT, () => {
      logger.info(
        `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
      );
      logger.info(
        `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
      );
    });
  });
  fs.watchFile('src/schema.graphql', (curr) => {
    if (!curr.isFile()) {
      logger.info('📝 Create schema.graphql');
      fs.writeFile('src/schema.graphql', '', (err) => {
        if (err) {
          throw err;
        } else {
          buildTypes();
        }
      });
    } else {
      logger.info('🔨 Rebuilding schema');
      buildSchema()
        .then((builtSchema: GraphQLSchema) => {
          logger.info('🛑 Stopping server');
          safeServer.update(builtSchema);
        })
        .catch((err: Error) => {
          logger.error(err.message);
        });
    }
  });
};

launchServer();
