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
import { ApolloServer } from 'apollo-server-express';
import EventEmitter from 'events';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import { logger } from '../services/logger.service';
import { winstonLogger } from './middlewares/winston';
import { Form, ReferenceData, Resource } from '@models';
import { buildSchema } from '@utils/schema';

/**
 * Definition of the main server.
 */
class SafeServer {
  public app: any;

  public httpServer: Server;

  public apolloServer: ApolloServer;

  public status = new EventEmitter();

  /** Adds listeners to relevant collections in order to rebuild schema */
  constructor() {
    Resource.watch().on('change', (data) => {
      if (data.operationType === 'insert' || data.operationType === 'delete') {
        // Reload schema on new resource or resource deletion
        this.update();
      } else if (data.operationType === 'update') {
        // When a resource is updated, only reload schema if fields were updated
        const updatedDocFields = Object.keys(
          data.updateDescription.updatedFields
        );
        if (
          updatedDocFields.some(
            (f) =>
              // Reload schema if fields were updated
              f.startsWith('fields') &&
              // Unless it's a permission update
              !new RegExp('^fields\\.[0-9]+\\.permissions\\.').test(f)
          )
        ) {
          this.update();
        }
      }
    });

    Form.watch().on('change', (data) => {
      if (data.operationType === 'insert' || data.operationType === 'delete') {
        // Reload schema on new form or form deletion
        this.update();
      } else if (data.operationType === 'update') {
        // When a form is updated, only reload schema if name or status were updated
        // Note that if the structure was updated, it'll also update the Resource fields
        // Which will trigger the Resource watcher above, so we should skip it here
        const fieldsThatRequireSchemaUpdate = ['name', 'status'];
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
  }

  /** Starts the server */
  public async start(): Promise<void> {
    const schema = await buildSchema();

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

    // === REST ===
    this.app.use(router);

    this.status.emit('ready');
  }

  /** Re-launches the server with updated schema */
  private update(): void {
    this.httpServer.removeListener('request', this.app);
    this.httpServer.close();
    logger.info('🛑 Stopping server');
    this.apolloServer.stop().then(() => {
      logger.info('🔁 Reloading server');
      this.start();
    });
  }
}

export { SafeServer };
