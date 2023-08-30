import express, { Express } from 'express';
import { createServer, Server } from 'http';
import {
  corsMiddleware,
  authMiddleware,
  graphqlMiddleware,
  rateLimitMiddleware,
} from './middlewares';
import { router } from '../routes';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import EventEmitter from 'events';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import { logger } from '../services/logger.service';
import { winstonLogger } from './middlewares/winston';
import { Form, ReferenceData, Resource } from '@models';
import buildSchema from '@utils/schema/buildSchema';
import { GraphQLSchema } from 'graphql';
import context, { Context } from './apollo/context';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import onConnect from './apollo/onConnect';

// List of beneficiaries that were
/**
 * Definition of the main server.
 */
class SafeServer {
  public app: Express;

  public httpServer: Server;

  public apolloServer: ApolloServer<Context>;

  public status = new EventEmitter();

  /** Adds listeners to relevant collections in order to rebuild schema */
  constructor() {
    Form.watch().on('change', (data) => {
      if (data.operationType === 'insert' || data.operationType === 'delete') {
        // Reload schema on new form or form deletion
        this.update();
      } else if (data.operationType === 'update') {
        // When a form is updated, only reload schema if name, structure or status were updated
        const fieldsThatRequireSchemaUpdate = ['name', 'status', 'structure'];
        const updatedDocFields = Object.keys(
          data.updateDescription.updatedFields
        );
        if (
          updatedDocFields.some((f) =>
            fieldsThatRequireSchemaUpdate.includes(f)
          )
        ) {
          this.update();
        }
      }
    });

    // All reference data changes require schema update
    ReferenceData.watch().on('change', () => {
      this.update();
    });

    // All resource changes require schema update
    Resource.watch().on('change', (data) => {
      if (data.operationType === 'update') {
        // When a form is updated, only reload schema if name, structure or status were updated
        const fieldsThatRequireSchemaUpdate = ['fields'];
        const updatedDocFields = Object.keys(
          data.updateDescription.updatedFields
        );
        if (
          updatedDocFields.some(
            (f) =>
              fieldsThatRequireSchemaUpdate.includes(f) &&
              data.updateDescription.updatedFields[f].some(
                (field) => field.isCalculated === true
              )
          )
        ) {
          this.update();
        }
      }
    });
  }

  /**
   * Starts the server
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

    // === APOLLO ===
    this.apolloServer = new ApolloServer<Context>({
      schema: schema,
      introspection: true,
      plugins: [
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

    // === REST ===
    this.app.use(router);

    this.status.emit('ready');
  }

  /** Re-launches the server with updated schema */
  private async update(): Promise<void> {
    const schema = await buildSchema();
    this.httpServer.removeListener('request', this.app);
    this.httpServer.close();
    logger.info('🛑 Stopping server');
    this.apolloServer.stop().then(() => {
      logger.info('🔁 Reloading server');
      this.start(schema);
    });
  }
}

export { SafeServer };
