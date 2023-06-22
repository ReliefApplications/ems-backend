import { SafeServer } from './server';
import mongoose from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import customNotificationScheduler from './server/customNotificationScheduler';
import { startDatabase } from './server/database';
// import SubscriptionServer from 'graphql-ws';
// import { SubscriptionServer } from 'subscriptions-transport-ws';
import fs from 'fs';
// import { mergeSchemas } from 'apollo-server-express';
import mergeSchemas from 'merge-schemas';
import { buildSchema, buildTypes } from './utils/schema';
import schema from './schema';
import { GraphQLSchema, execute, subscribe } from 'graphql';
import config from 'config';
import { logger } from './services/logger.service';
import { checkConfig } from '@utils/server/checkConfig.util';
// Needed for survey.model, as xmlhttprequest is not defined in servers
global.XMLHttpRequest = require('xhr2');
import cors from 'cors';
import { json } from 'body-parser';
import { expressMiddleware } from '@apollo/server/express4';
// import { WebSocketServer } from 'ws';
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

  await safeServer.apolloServer.start();
  safeServer.app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(safeServer.apolloServer)
  );
  // const wsServer = new WebSocketServer({
  //   // This is the `httpServer` we created in a previous step.
  //   server: safeServer.httpServer,
  //   // Pass a different path here if app.use
  //   // serves expressMiddleware at a different path
  //   path: '/graphql',
  // });

  // safeServer.httpServer.('upgrade', (request, socket, head) => {
  //   SubscriptionServer.create(
  //     {
  //       schema: liveSchema, execute, subscribe
  //     },
  //     {
  //       server: safeServer.httpServer,
  //     },
  //   )(request, socket, head);
  // });

  // const subscriptionServer: SubscriptionServer = SubscriptionServer.create(
  //   { schema: liveSchema, execute, subscribe },
  //   { server: safeServer.httpServer, path: '/graphql' }
  // );

  // console.log("safeServer.httpServer ===============>>>>>>", JSON.stringify(safeServer.httpServer));
  // console.log("safeServer.status ===============>>>>>>", JSON.stringify(safeServer.status));

  // console.log('safeServer ========>>', safeServer);

  safeServer.httpServer.listen(PORT, () => {
    // logger.info(
    //   `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
    // );
    // logger.info(
    //   `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
    // );
    logger.info(`🚀 Server ready at http://localhost:${PORT}`);
    logger.info(`🚀 Server ready at ws://localhost:${PORT}`);
  });
  safeServer.status.on('ready', () => {
    safeServer.httpServer.listen(PORT, () => {
      // logger.info(
      //   `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
      // );
      // logger.info(
      //   `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
      // );
      logger.info(`🚀 Server status ready at http://localhost:${PORT}`);
      logger.info(`🚀 Server status ready at ws://localhost:${PORT}`);
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
