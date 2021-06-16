import pubsub from '../pubsub';

export default async ({ req, connection }) => {
    if (connection) {
        return {
            user: connection.context,
            pubsub: await pubsub()
        };
    }
    if (req) {
        return {
            // not a clean fix but that works for now
            user: (req as any).user
        };
    }
}
