import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import pubsub from '../../server/pubsub';
import { User } from '@models';
import { NotificationType } from '../types';

/**
 * Subscription to detect new notifications.
 * TODO: rethink how logs are created in the system.
 */
export default {
  type: NotificationType,
  subscribe: async (parent, args, context) => {
    // Subscribe to channels available in user's roles
    const subscriber: AMQPPubSub = await pubsub();
    const user: User = context.user;
    return subscriber.asyncIterator(
      user.roles.map((role) => role.channels.map((x) => String(x._id))).flat()
    );
  },
};
