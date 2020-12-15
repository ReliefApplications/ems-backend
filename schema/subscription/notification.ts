import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';

export default {
    type: NotificationType,
    async subscribe() {
        const subscriber = await pubsub();
        return subscriber.asyncIterator(['notification']);
    }
}