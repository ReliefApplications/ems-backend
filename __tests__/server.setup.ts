import express from 'express';
// import { graphqlUploadExpress } from 'graphql-upload';
// import apollo from '@server/apollo';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import { createServer, Server } from 'http';
import {
  authMiddleware,
  corsMiddleware,
  graphqlMiddleware,
  rateLimitMiddleware,
} from '@server/middlewares';
import { router } from '../src/routes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from '@apollo/server';
import EventEmitter from 'events';
import dataSources from '@server/apollo/dataSources';
import { AppAbility, conditionsMatcher } from '@security/defineUserAbility';
import i18nextMiddleware from 'i18next-http-middleware';
import { Role, User } from '@models';
import { AbilityBuilder } from '@casl/ability';
import { Ability, AbilityClass } from '@casl/ability';
import { useServer } from 'graphql-ws/lib/use/ws';
import onConnect from '@server/apollo/onConnect';
import context, { Context } from '@server/apollo/context';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@apollo/server/express4';
import { WebSocketServer } from 'ws';

/**
 * Define the ability of the server.
 */
// eslint-disable-next-line deprecation/deprecation
const appAbility = Ability as AbilityClass<AppAbility>;
/**
 * Definition of test server.
 */
class SafeTestServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer<Context>;

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
    this.app.use(authMiddleware);
    this.app.use('/graphql', graphqlMiddleware);
    this.app.use(i18nextMiddleware.handle(i18next));

    // === SUBSCRIPTIONS ===
    this.httpServer = createServer(this.app);
    const wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/graphql',
    });
    const serverCleanup = useServer(
      {
        schema,
        context: onConnect,
      },
      wsServer
    );
    this.getUserTest();

    // === APOLLO ===
    this.apolloServer = new ApolloServer<Context>({
      schema: schema,
      introspection: true,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault(),
        // Proper shutdown for the WebSocket server.
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose();
              },
            };
          },
        },
      ],
    });
    await this.apolloServer.start();
    this.app.use(
      '/graphql',
      expressMiddleware<Context>(this.apolloServer, {
        context: context(this.apolloServer),
      })
    );
    //this.apolloServer.getMiddleware({ app: this.app });

    // === SUBSCRIPTIONS ===
    this.httpServer = createServer(this.app);
    // this.apolloServer.installSubscriptionHandlers(this.httpServer);

    // === REST ===
    this.app.use(router);

    // test route
    this.app.get('/status', (req, res) => {
      res.send('Server is working!');
    });

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
    //const dataSourcesInstance = await dataSources();
    return new ApolloServer({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
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
      user.ability = this.defineUserAbilityMock();
      return {
        user,
      };
    } else {
      return null;
    }
  }

  /**
   * Defines abilities for the mock test user.
   *
   * @returns ability definition of the user
   */
  private static defineUserAbilityMock(): AppAbility {
    const abilityBuilder = new AbilityBuilder(appAbility);
    const can = abilityBuilder.can;
    can(
      ['read', 'create', 'update', 'delete', 'manage'],
      [
        'Layer',
        'Application',
        'Dashboard',
        'Channel',
        'Page',
        'Step',
        'Workflow',
        'Template',
        'DistributionList',
        'CustomNotification',
      ]
    );
    return abilityBuilder.build({ conditionsMatcher });
  }

  /**
   * Remove admin role from user to test.
   *
   */
  public async removeAdminRoleToUserBeforeTest() {
    await User.updateOne({ username: 'dummy@dummy.com' }, { roles: [] });
  }

  /**
   * Restore admin role from user to test.
   *
   */
  public async restoreAdminRoleToUserAfterTest() {
    const admin = await Role.findOne({ title: 'admin' });
    await User.updateOne(
      { username: 'dummy@dummy.com' },
      { roles: [admin._id] }
    );
  }

  /**
   * Create user if necessary.
   */
  private async getUserTest() {
    const user = await User.find({
      username: { $in: 'dummy@dummy.com' },
    });
    if (user.length > 0) await User.deleteMany({ username: 'dummy@dummy.com' });

    const admin = await Role.findOne({ title: 'admin' });
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const newUser = await new User({
      username: 'dummy@dummy.com',
      roles: admin._id,
      ability: SafeTestServer.defineUserAbilityMock(),
      deleteAt: date,
    }).save();
    return newUser;
  }
}

export { SafeTestServer };
