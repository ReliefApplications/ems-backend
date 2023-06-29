import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import apollo from './apollo';
import { createServer, Server } from 'http';
import {
  corsMiddleware,
  authMiddleware,
  graphqlMiddleware,
  rateLimitMiddleware,
} from './middlewares';
import { router } from '../routes';
// import { execute, GraphQLSchema, subscribe } from 'graphql';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from '@apollo/server';
import EventEmitter from 'events';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
// import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import { logger } from '../services/logger.service';
import { winstonLogger } from './middlewares/winston';
// import { json } from 'body-parser';
// import { expressMiddleware } from '@apollo/server/express4';
// import { WebSocketServer } from 'ws';
// import { useServer } from 'graphql-ws/lib/use/ws';
// import context from './apollo/context';
// import { getReferenceDatas, getStructures } from '@utils/schema/getStructures';
// import fs from 'fs';
// import { Form } from '@models';
// import { getResolvers } from '@utils/schema/resolvers';
// import dataSources from './apollo/dataSources';

// /** The file path for the GraphQL schemas */
// const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Definition of the main server.
 */
class SafeServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

  public status = new EventEmitter();

  /**
   * Starts the server.
   *
   * @param schema GraphQL schema.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async start(schema: GraphQLSchema): Promise<void> {
    // === EXPRESS ===
    this.app = express();

    // === REQUEST SIZE ===
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.urlencoded({ limit: '5mb', extended: true }));

    // === ADD MIDDLEWARES ===
    this.app.use(winstonLogger);

    i18next
      .use(Backend)
      .use(i18nextMiddleware.LanguageDetector)
      .init({
        backend: {
          loadPath: 'src/i18n/{{lng}}.json',
        },
        fallbackLng: 'en',
        preload: ['en', 'test'],
      });
    this.app.use(rateLimitMiddleware);
    this.app.use(corsMiddleware);
    this.app.use(authMiddleware);
    this.app.use('/graphql', graphqlMiddleware);
    this.app.use(
      '/graphql',
      graphqlUploadExpress({ maxFileSize: 7340032, maxFiles: 10 })
    );
    this.app.use(i18nextMiddleware.handle(i18next));

    // === APOLLO ===
    // this.apolloServer = await apollo();
    // this.apolloServer = await apollo(schema);
    this.apolloServer = await apollo(schema);
    this.httpServer = createServer(this.app);

    // === Middleware ===
    // this.apolloServer.applyMiddleware({ app: this.app });
    // console.log('serverCleanup ======>>>>', JSON.stringify(serverCleanup));
    // await this.apolloServer.start();
    // this.app.use(
    //   '/graphql',
    //   cors<cors.CorsRequest>(),
    //   json(),
    //   expressMiddleware(this.apolloServer)
    // );

    // === SUBSCRIPTIONS ===
    // Hand in the schema we just created and have the
    // WebSocketServer start listening.
    // this.apolloServer.installSubscriptionHandlers(this.httpServer);

    // const serverPath: any = this.httpServer;
    // const graphqlCurrectPath = serverPath.graphqlPath;
    // const serverHttp = this.httpServer;
    // SubscriptionServer.create(
    //   { schema: schema, execute, subscribe },
    //   { server: this.httpServer, path: graphqlCurrectPath }
    // );

    // Creating the WebSocket server
    // const wsServer = new WebSocketServer({
    //   // This is the `httpServer` we created in a previous step.
    //   server: serverPath,
    //   // Pass a different path here if app.use
    //   // serves expressMiddleware at a different path
    //   path: '/graphql',
    // });

    // Hand in the schema we just created and have the
    // WebSocketServer start listening.
    // this.apolloServer = useServer({ schema }, wsServer);
    // console.log("wsServer ===========>>", wsServer);

    // === REST ===
    this.app.use(router);

    this.status.emit('ready');
  }

  /**
   * Relaunchs the server with updated schema.
   *
   * @param schema new GraphQL schema.
   */
  public update(schema: GraphQLSchema): void {
    this.httpServer.removeListener('request', this.app);
    this.httpServer.close();
    this.apolloServer.stop().then(() => {
      logger.info('🔁 Reloading server');
      this.start(schema);
    });
  }
}

export { SafeServer };
