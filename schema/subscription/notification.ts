import { NotificationType } from "../types";
import { withFilter } from "graphql-subscriptions";
import { Role, User } from '../../models';

export default {
    type: NotificationType,
    subscribe: (parent, args, context) => {
        const user: User = context.user;
        const channels: string[] = [];
        user.roles.map((role) => role.channels.map(x => channels.push(String(x._id))));
        return context.pubsub.asyncIterator(channels);
    }
}
