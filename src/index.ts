import { SafeServer } from './server';
import mongoose, { connection } from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import customNotificationScheduler from './server/customNotificationScheduler';
import { startDatabase } from './server/database';
import fs from 'fs';
import { mergeSchemas } from '@graphql-tools/schema';
import { buildSchema, buildTypes } from './utils/schema';
import schema from './schema';
import { GraphQLSchema, execute, subscribe } from 'graphql';
import config from 'config';
import { logger } from './services/logger.service';
import { checkConfig } from '@utils/server/checkConfig.util';
// Needed for survey.model, as xmlhttprequest is not defined in servers
global.XMLHttpRequest = require('xhr2');
import { startStandaloneServer } from '@apollo/server/standalone';
import context from '@server/apollo/context';
// import { expressMiddleware } from '@apollo/server/express4';
// import { WebSocketServer } from 'ws';
import { SubscriptionServer } from 'ws';
// import { useServer } from 'graphql-ws/lib/use/ws';
// import dataSources from '@server/apollo/dataSources';
// import onConnect from '@server/apollo/onConnect';
// import { on } from 'winston-daily-rotate-file';
// import dataSources from '@server/apollo/dataSources';
// import dataSources from '@server/apollo/dataSources';
// import onConnect from '@server/apollo/onConnect';
// import onConnect from '@server/apollo/onConnect';
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
const PORT: any = config.get('server.port');

startDatabase();
mongoose.connection.once('open', () => {
  logger.log({ level: 'info', message: '📶 Connected to database' });
  subscriberSafe();
  pullJobScheduler();
  customNotificationScheduler();
});

/**
 * Gets the GraphQL schema, merging the built schema to the base one, when possible
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

  // Create the WebSocket server manually
  const wsServer = new SubscriptionServer(
    {
      schema: liveSchema,
      execute,
      subscribe,
    },
    {
      server: safeServer.httpServer,
      path: '/graphql',
    }
  );

  // Handle the upgrade event for WebSocket connections
  safeServer.httpServer.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit('connection', ws, request);
    });
  });
  // Handle WebSocket upgrades manually
  console.log('wsServer=========>>>', JSON.stringify(wsServer));
  await startStandaloneServer(safeServer.apolloServer, {
    context: async ({ req }) => {
      return {
        ...context({ req, connection, wsServer }),
      };
    },
    listen: { port: PORT },
  }).then(() => {
    logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    logger.info(`🚀 Server status ready at ws://localhost:${PORT}`);
  });

 
  // safeServer.httpServer.on('upgrade', (request, socket, head) => {
  //   subscriptionServer.handleUpgrade(request, socket, head, (socket: any) => {
  //     subscriptionServer.emit('connection', socket, request);
  //   });
  // });
  // await dataSources();
  // safeServer.context = ({ req }) => {
  //   return context({ req, connection });
  // };
  // safeServer.datasources = () => {
  //   return dataSources();
  // };
  // safeServer.subscriptions = async ({ req }) => {
  //   return {
  //     onConnect: await onConnect(
  //       {
  //         authToken: req.headers.authorization,
  //       },
  //       safeServer.wsServer
  //     ),
  //   };
  // };

  // console.log(
  //   'safeServer.apolloServer ============>>>',
  //   JSON.stringify(safeServer.apolloServer)
  // );
  // safeServer.httpServer.listen(PORT, () => {
  //   // logger.info(
  //   //   `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
  //   // );
  //   // logger.info(
  //   //   `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
  //   // );
  //   logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  //   logger.info(`🚀 Server ready at ws://localhost:${PORT}`);
  // });

  safeServer.status.on('ready', () => {
    safeServer.httpServer.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}/graphql`);
      logger.info(`🚀 Server status ready at ws://localhost:${PORT}`);
      // `🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`
      // logger.info(
      //   `🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`
      // );
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
