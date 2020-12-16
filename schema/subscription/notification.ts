import { NotificationType } from "../types";
import pubsub from '../../server/pubsub';
import { Role, User } from '../../models';

export default {
    type: NotificationType,
    resolve: (payload, args, context, info) => {
        const user: User = context.user;
        let types: string[] = []
        user.roles.map((role: Role) => role.notifications.map(x => types.push(x)));
        console.log(types);
        if (types.includes(payload.notification.type)) {
            return payload.notification;
        }
        return null;
    },
    async subscribe() {
        const subscriber = await pubsub();
        return subscriber.asyncIterator('notification');
    }
}