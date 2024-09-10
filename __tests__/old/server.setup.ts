import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from '@server/apollo';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import { createServer, Server } from 'http';
import {
  corsMiddleware,
  graphqlMiddleware,
  rateLimitMiddleware,
} from '@server/middlewares';
import { router } from '../../src/routes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import EventEmitter from 'events';
import dataSources from '@server/apollo/dataSources';
import defineUserAbility from '@security/defineUserAbility';
import i18nextMiddleware from 'i18next-http-middleware';

/**
 * Definition of test server.
 */
class SafeTestServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

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

    // === MIDDLEWARES ===
    this.app.use(rateLimitMiddleware);
    this.app.use(corsMiddleware);
    // this.app.use(authMiddleware);
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

    // === REST ===
    this.app.use(router);

    this.status.emit('ready');
  }

  /**
   * Creates an Apollo Server with testing context.
   *
   * @param schema GraphQL schema
   * @param user current user
   * @returns Apollo test server
   */
  public static async createApolloTestServer(
    schema: GraphQLSchema,
    user: any
  ): Promise<ApolloServer> {
    return new ApolloServer({
      uploads: false,
      schema: schema,
      introspection: true,
      playground: true,
      context: this.context(user),
      dataSources: await dataSources(),
    });
  }

  /**
   * Relaunchs the server with updated schema.
   *
   * @param schema new schema.
   */
  public update(schema: GraphQLSchema): void {
    this.httpServer.removeListener('request', this.app);
    this.httpServer.close();
    this.apolloServer.stop().then(() => {
      console.log('🔁 Reloading server');
      this.start(schema);
    });
  }

  /**
   * Sets the context of the server.
   *
   * @param user logged user.
   * @returns context.
   */
  private static context(user: any): any {
    if (user) {
      user.ability = defineUserAbility(user);
      return {
        user,
      };
    } else {
      return null;
    }
  }
}

export { SafeTestServer };
