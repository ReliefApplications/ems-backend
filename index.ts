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

const server = new SafeServer();

server.status.on('ready', () => {
    console.log(server.httpServer);
    server.httpServer.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`🚀 Server ready at ws://localhost:${PORT}/graphql`);
    });
});
