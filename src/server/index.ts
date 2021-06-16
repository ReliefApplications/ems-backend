import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from './apollo';
import { createServer } from 'http';
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
    public httpServer: any;
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
            console.log('start')
            this.start(schema);
        });
        this.listenToSchemaUpdate();
    }

    private start(schema: GraphQLSchema): void {
        console.log(0)
        // === APOLLO ===
        this.apolloServer = apollo(schema);
        // this.apolloServer.start();

        console.log(1)
        // === EXPRESS ===
        this.app = express();
        // this.httpServer = createServer(this.app);

        console.log(2)
        // === MIDDLEWARES ===
        this.app.use(corsMiddleware);
        this.app.use(authMiddleware);
        this.app.use('/graphql', graphqlMiddleware);
        this.app.use('/graphql', graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
        this.apolloServer.applyMiddleware({ app: this.app });

        console.log(3)
        // === SUBSCRIPTIONS ===
        this.httpServer = createServer(this.app);
        this.apolloServer.installSubscriptionHandlers(this.httpServer);

        console.log(4)
        // === REST ===
        this.app.use(router);

        console.log(5)
        // === PROXY ===
        buildProxies(this.app);

        console.log(6)
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
