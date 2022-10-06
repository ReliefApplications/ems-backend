import { SafeServer } from './server';
import mongoose from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import { startDatabase } from './server/database';
import fs from 'fs';
import { mergeSchemas } from 'apollo-server-express';
import { buildSchema, buildTypes } from './utils/schema';
import schema from './schema';
import { GraphQLSchema } from 'graphql';
import config from 'config';
import { logger } from './services/logger.service';
import configVariables from './const/configVariables';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request interface definition */
    interface Request {
      context: any;
    }
  }
}

/** SafeServer server port */
const PORT = config.get('server.port');

startDatabase();
mongoose.connection.once('open', () => {
  logger.log({ level: 'info', message: '📶 Connected to database' });
  subscriberSafe();
  pullJobScheduler();
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
  for await (const envKey of configVariables) {
    if (!process.env[envKey]) {
      logger.info(`🛑 Missing environment variable: {${envKey}}`);
      throw `Missing environment variable: {${envKey}}`;
    }
  }

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
        .catch((err) => {
          logger.error(err);
        });
    }
  });
};

launchServer();
