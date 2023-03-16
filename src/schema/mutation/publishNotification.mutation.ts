import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLString,
  GraphQLID,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { NotificationType } from '../types';
import { Notification } from '@models';
import pubsub from '../../server/pubsub';

/**
 * Create a notification and store it in the database.
 * Then publish it to the corresponding channel(s).
 * Throw an error if arguments are invalid.
 */
export default {
  type: NotificationType,
  args: {
    action: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLJSON) },
    channel: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    if (!args || !args.action || !args.content || !args.channel)
      throw new GraphQLError(
        context.i18next.t(
          'mutations.notification.publish.errors.invalidArguments'
        )
      );
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const notification = new Notification({
      action: args.action,
      content: args.content,
      //createdAt: new Date(),
      channel: args.channel,
      seenBy: [],
    });
    await notification.save();
    const publisher = await pubsub();
    publisher.publish(args.channel, { notification });
    return notification;
  },
};
