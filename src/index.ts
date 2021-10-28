import { SafeServer } from './server';
import mongoose from 'mongoose';
import subscriberSafe from './server/subscriberSafe';
import pullJobScheduler from './server/pullJobScheduler';
import { startDatabase } from './server/database';
import fs from 'fs';
import { mergeSchemas } from 'apollo-server-express';
import { buildSchema, buildTypes } from './utils/schema';
import schema from './schema';
import { GraphQLSchema } from 'graphql';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            context: any;
        }
    }
}

const PORT = 3000;

startDatabase();
mongoose.connection.once('open', () => {
    console.log('📶 Connected to database');
    subscriberSafe();
    pullJobScheduler();
});

const getSchema = async () => {
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
};

const launchServer = async () => {
    const schema = await getSchema();
    const safeServer = new SafeServer(schema);
    safeServer.httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`);
        console.log(`🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`);
    });
    safeServer.status.on('ready', () => {
        safeServer.httpServer.listen(PORT, () => {
            console.log(`🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`);
            console.log(`🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`);
        });
    });
    fs.watchFile('src/schema.graphql', (curr) => {
        if (!curr.isFile()) {
            console.log('📝 Create schema.graphql');
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
                    safeServer.update(builtSchema);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    });
};

launchServer();
