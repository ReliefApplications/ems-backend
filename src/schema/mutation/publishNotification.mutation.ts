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
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the publishNotification mutation */
type PublishNotificationArgs = {
  action: string;
  content: any;
  channel: string;
};

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
  async resolve(parent, args: PublishNotificationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (!args || !args.action || !args.content || !args.channel)
        throw new GraphQLError(
          context.i18next.t(
            'mutations.notification.publish.errors.invalidArguments'
          )
        );
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
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
