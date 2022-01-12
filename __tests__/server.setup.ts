import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from '../src/server/apollo';
import { createServer, Server } from 'http';
import { corsMiddleware, graphqlMiddleware } from '../src/server/middlewares';
import { router } from '../src/routes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import EventEmitter from 'events';
import dataSources from '../src/server/apollo/dataSources';
import defineAbilitiesFor from '../src/security/defineAbilityFor';

class SafeTestServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

  public status = new EventEmitter();

  public async start(schema: GraphQLSchema): Promise<void> {
    // === EXPRESS ===
    this.app = express();

    // === MIDDLEWARES ===
    this.app.use(corsMiddleware);
    // this.app.use(authMiddleware);
    this.app.use('/graphql', graphqlMiddleware);
    this.app.use(
      '/graphql',
      graphqlUploadExpress({ maxFileSize: 7340032, maxFiles: 10 })
    );

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
      context: () => ({
        user: {
          ...user,
          ability: defineAbilitiesFor(user),
        },
      }),
      dataSources: await dataSources(),
    });
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

export { SafeTestServer };
