import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';

export default {
    type: NotificationType,
    resolve: (payload, args, context, info) => {
        console.log(JSON.stringify(context));
        return payload.notification;
    },
    async subscribe() {
        const subscriber = await pubsub();
        return subscriber.asyncIterator(['notification']);
    }
}