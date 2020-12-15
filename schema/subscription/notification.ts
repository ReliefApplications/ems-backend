import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';

export default {
    type: NotificationType,
    resolve: (payload, args, context, info) => {
        console.log('b4 user');
        const user = context.user;
        console.log('after user');
        console.log(user.name);
        return payload.notification;
    },
    async subscribe() {
        const subscriber = await pubsub();
        return subscriber.asyncIterator(['notification']);
    }
}