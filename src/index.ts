import { SafeServer } from './server';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            context: any;
        }
    }
}

const PORT = 3000;

const safeServer = new SafeServer();

safeServer.status.on('ready', () => {
    safeServer.httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/${safeServer.apolloServer.graphqlPath}`);
        console.log(`🚀 Server ready at ws://localhost:${PORT}/${safeServer.apolloServer.subscriptionsPath}`);
    });
});
