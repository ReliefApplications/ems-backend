import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';

export default {
    type: NotificationType,
    subscribe() {
        return pubsub.asyncIterator(['notification']);
    }
}