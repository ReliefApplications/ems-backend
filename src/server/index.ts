import express from 'express';
import { graphqlUploadExpress } from 'graphql-upload';
import apollo from './apollo';
import { createServer, Server } from 'http';
import { corsMiddleware, authMiddleware, graphqlMiddleware } from './middlewares';
import { router } from '../routes';
import { GraphQLSchema } from 'graphql';
import { ApolloServer } from 'apollo-server-express';
import buildProxies from '../utils/buildProxies';
import EventEmitter from 'events';
import fileUpload from 'express-fileupload';

class SafeServer {

    public app: any;
    public httpServer: Server;
    public apolloServer: ApolloServer;
    public status = new EventEmitter();

    constructor(schema: GraphQLSchema) {
        this.start(schema);
    }

    public start(schema: GraphQLSchema): void {
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
        this.app.use(fileUpload());
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
        })
    }
}

export { SafeServer };
