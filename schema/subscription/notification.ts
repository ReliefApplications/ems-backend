import { NotificationType } from "../types";
import { withFilter } from "graphql-subscriptions";
import { Role, User } from '../../models';

export default {
    type: NotificationType,
    subscribe: (parent, args, context) => {
        return withFilter(() => context.pubsub.asyncIterator('notification'), (payload, variables) => {
            const user: User = context.user;
            const types: string[] = []
            user.roles.map((role: Role) => role.notifications.map(x => types.push(x)));
            return types.includes(payload.notification.type)
        })(parent, args, context);
    }
}