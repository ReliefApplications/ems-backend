import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload-ts';
// import { graphqlServerExpressUpload } from 'graphql-server-express-upload';

import apollo from './apollo';
import { createServer, Server } from 'http';
import {
  corsMiddleware,
  authMiddleware,
  graphqlMiddleware,
  rateLimitMiddleware,
} from './middlewares';
import { router } from '../routes';
import { GraphQLSchema } from 'graphql';
// import { execute, GraphQLSchema, subscribe } from 'graphql';
// import { ApolloServer } from 'apollo-server-express';
import { ApolloServer } from '@apollo/server';
import EventEmitter from 'events';
import i18next from 'i18next';
// import Backend from 'i18next-node-fs-backend';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import { logger } from '../services/logger.service';
import { winstonLogger } from './middlewares/winston';
import { FormService } from '@services/form.service';
// import applyMiddleware from 'apply-middleware';
// import { expressMiddleware } from '@apollo/server/express4';
// import cors from 'cors';
// import { json } from 'body-parser';
// import { SubscriptionServer } from 'subscriptions-transport-ws';
// import { SubscriptionServer } from 'graphql-ws';
// import createWebSocketGraphQLServer from 'graphql-ws';
// import { WebSocketServer } from 'ws';
// import { useServer } from 'graphql-ws/lib/use/ws';
// import { SubscriptionServer } from 'subscriptions-transport-ws';
// import { makeExecutableSchema } from '@graphql-tools/schema';
// import context from './apollo/context';
// import dataSources from './apollo/dataSources';

/**
 * Definition of the main server.
 */
class SafeServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

  private formService = new FormService();

  public status = new EventEmitter();

  /**
   * Starts the server.
   *
   * @param schema GraphQL schema.
   */
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
    this.apolloServer = await apollo(schema);
    // this.apolloServer = new ApolloServer({
    //   schema
    // });
    // console.log("this.apolloServer ===========>>>>", );

    // this.apolloServer.applyMiddleware({ app: this.app });
    // this.app.use(
    //   '/graphql',
    //   cors<cors.CorsRequest>(),
    //   json(),
    //   expressMiddleware(this.app)
    // );
    // applyMiddleware(this.app);

    // === SUBSCRIPTIONS ===
    this.httpServer = createServer(this.app);
    // const wsServer = new WebSocketServer({
    //   // This is the `httpServer` we created in a previous step.
    //   server: this.apolloServer,
    //   // Pass a different path here if app.use
    //   // serves expressMiddleware at a different path
    //   path: '/graphql',
    // });

    // // Hand in the schema we just created and have the
    // // WebSocketServer start listening.
    // const serverCleanup = useServer({ schema }, wsServer);
    // console.log("const serverCleanup ===========>>", JSON.stringify(serverCleanup));

    // this.apolloServer.installSubscriptionHandlers(this.httpServer);
    // const serverPath = this.httpServer;
    // const graphqlCurrectPath: any = serverPath.graphqlPath;
    // const serverHttp = this.httpServer;
    // SubscriptionServer.create(
    //   { schema: schema, execute, subscribe },
    //   { server: this.httpServer, path: graphqlCurrectPath }
    // );

    // const serverPaths = SubscriptionServer.create(
    //   {
    //     schema,
    //     execute,
    //     subscribe,
    //   },
    //   {
    //     server: this.httpServer,
    //     path: graphqlCurrectPath,
    //   }
    // );
    // console.log('serverPaths=========>>', JSON.stringify(serverPaths));

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
