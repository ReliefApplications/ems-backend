import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from './apollo';
import { createServer, Server } from 'http';
import schema from '../schema';
import { corsMiddleware, authMiddleware, graphqlMiddleware } from './middlewares';
import { router } from '../routes';
import buildSchema from '../utils/buildSchema';
import buildTypes from '../utils/buildTypes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer, mergeSchemas } from 'apollo-server-express';
import fs from 'fs';
import buildProxies from '../utils/buildProxies';
import mongoose from 'mongoose';
import { startDatabase } from './database';
import subscriberSafe from './subscriberSafe';
import pullJobScheduler from './pullJobScheduler';
import EventEmitter from 'events';

class SafeServer {

    public app: any;
    public httpServer: Server;
    public apolloServer: ApolloServer;
    public status = new EventEmitter();

    constructor() {
        startDatabase();
        mongoose.connection.once('open', () => {
            console.log('📶 Connected to database');
            subscriberSafe();
            pullJobScheduler();
        });
        this.getSchema().then((schema) => {
            this.start(schema);
        });
        this.listenToSchemaUpdate();
    }

    private start(schema: GraphQLSchema): void {
        // === EXPRESS ===
        this.app = express();

        // === MIDDLEWARES ===
        this.app.use(corsMiddleware);
        this.app.use(authMiddleware);
        this.app.use('/graphql', graphqlMiddleware);
        this.app.use('/graphql', graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

        // === APOLLO ===
        this.apolloServer = apollo(schema);
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

    private async getSchema(): Promise<GraphQLSchema> {
        try {
            const builtSchema: GraphQLSchema = await buildSchema();
            return mergeSchemas({
                schemas: [
                    schema,
                    builtSchema
                ]
            });
        } catch {
            return schema;
        }
    }

    private listenToSchemaUpdate(): void {
        fs.watchFile('src/schema.graphql', (curr) => {
            if (!curr.isFile()) {
                console.log('📝 Create schema.graphql')
                fs.writeFile('src/schema.graphql', '', err => {
                    if (err) {
                        throw err;
                    } else {
                        buildTypes();
                    }
                });
            } else {
                console.log('🔨 Rebuilding schema');
                buildSchema()
                    .then((builtSchema: GraphQLSchema) => {
                        console.log('🛑 Stopping server');
                        this.httpServer.removeListener('request', this.app);
                        this.httpServer.close();
                        this.apolloServer.stop().then(() => {
                            console.log('🔁 Reloading server');
                            this.start(builtSchema);
                        })
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });
    }
}

export { SafeServer };
