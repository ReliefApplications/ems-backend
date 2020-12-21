import { NotificationType } from "../types";
import { withFilter } from "graphql-subscriptions";
import { Role, User } from '../../models';

export default {
    type: NotificationType,
    subscribe: (parent, args, context) => {
        return withFilter(() => context.pubsub.asyncIterator('notification'), (payload, variables) => {
            const user: User = context.user;
            const channels: string[] = []
            user.roles.map((role) => role.channels.map(x => channels.push(String(x._id))));
            return channels.includes(payload.notification.channel) 
        })(parent, args, context);
    }
}
