import { GraphQLNonNull, GraphQLError, GraphQLString, GraphQLID } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { NotificationType } from '../types';
import { Notification } from '../../models';
import pubsub from '../../server/pubsub';

export default {
    /*  Create a notification and store it in the database.
        Then publish it to the corresponding channel(s).
        Throws an error if arguments are invalid.
    */
    type: NotificationType,
    args: {
        action: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLJSON) },
        channel: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        if (!args || !args.action || !args.content || !args.channel) throw new GraphQLError(errors.invalidPublishNotificationArguments);
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const notification = new Notification({
            action: args.action,
            content: args.content,
            createdAt: new Date(),
            channel: args.channel,
            seenBy: []
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(args.channel, { notification });
        return notification;
    },
}
