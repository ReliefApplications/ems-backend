import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
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
import { ApolloServer } from 'apollo-server-express';
import EventEmitter from 'events';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import { logger } from '../services/logger.service';
import { winstonLogger } from './middlewares/winston';
import { FormService } from '@services/form.service';
import config from 'config';
import RedisStore from "connect-redis"
import session from "express-session"

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
    this.apolloServer.applyMiddleware({ app: this.app });

    // === SUBSCRIPTIONS ===
    this.httpServer = createServer(this.app);
    this.apolloServer.installSubscriptionHandlers(this.httpServer);

    // === REDIS ===
    const Redis = require("ioredis");
    const redisUri = config.get('redis.url');
    const redisClient = new Redis(redisUri);
    this.app.use(
      session({
        store: new RedisStore({ client: redisClient }),
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: false, // set to true if using HTTPS
          maxAge: 1000 * 60 * 60 * 24, // session cookie expires after 1 day
        },
      })
    );

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
