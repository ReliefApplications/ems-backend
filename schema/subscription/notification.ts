import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';
import { withFilter } from "graphql-subscriptions";
import { Role, User } from '../../models';

export default {
    type: NotificationType,
    async subscribe() {
        const subscriber = await pubsub();
        withFilter(
            () => subscriber.asyncIterator('notification'),
            (payload, variables, context, info) => {
                const user: User = context.user;
                console.log(JSON.stringify(context));
                let types: string[] = []
                user.roles.map((role: Role) => role.notifications.map(x => types.push(x)));
                console.log(types);
                return types.includes(payload.notification.type)
            }
        )
    } 
}