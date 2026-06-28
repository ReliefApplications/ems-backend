import { RedisPubSub } from 'graphql-redis-subscriptions';
import pubsub from '../../server/pubsub';
import { User } from '@models';
import { NotificationType } from '../types';
import { Context } from '@server/apollo/context';

/**
 * Subscription to detect new notifications.
 * TODO: rethink how logs are created in the system.
 */
export default {
  type: NotificationType,
  subscribe: async (parent, args, context: Context) => {
    // Subscribe to channels available in user's roles, as well as the user's
    // personal topic used for user-targeted notifications (e.g. relayed email
    // events).
    const subscriber: RedisPubSub = await pubsub();
    const user: User = context.user;
    const topics = user.roles
      .map((role) => role.channels.map((x) => String(x._id)))
      .flat();
    topics.push(String(user._id));
    return subscriber.asyncIterator(topics);
  },
};
