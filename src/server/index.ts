import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from './apollo';
import { createServer, Server } from 'http';
import { corsMiddleware, authMiddleware, graphqlMiddleware } from './middlewares';
import { router } from '../routes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import { buildProxies } from '../utils/proxy';
import EventEmitter from 'events';

class SafeServer {

  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

  public status = new EventEmitter();

  constructor() {}

  public async start(schema: GraphQLSchema): Promise<void> {
    // === EXPRESS ===
    this.app = express();

    // === REQUEST SIZE ===
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.urlencoded({ limit: '5mb', extended: true }));

    // === MIDDLEWARES ===
    this.app.use(corsMiddleware);
    this.app.use(authMiddleware);
    this.app.use('/graphql', graphqlMiddleware);
    this.app.use('/graphql', graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

    // === APOLLO ===
    this.apolloServer = await apollo(schema);
    this.apolloServer.applyMiddleware({ app: this.app });

    // === SUBSCRIPTIONS ===
    this.httpServer = createServer(this.app);
    this.apolloServer.installSubscriptionHandlers(this.httpServer);

    // === REST ===
    this.app.use(router);

    // === PROXY ===
    buildProxies(this.app);

    this.status.emit('ready');
  }

  public update(schema: GraphQLSchema): void {
    this.httpServer.removeListener('request', this.app);
    this.httpServer.close();
    this.apolloServer.stop().then(() => {
      console.log('🔁 Reloading server');
      this.start(schema);
    });
  }
}

export { SafeServer };
