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
    const subscriber: RedisPubSub = await pubsub();
    const user: User = context.user;
    const channelIds = user.roles
      .map((role) => role.channels.map((x) => String(x._id)))
      .flat();
    return subscriber.asyncIterator([
      ...channelIds,
      `user:${String(user._id)}`,
    ]);
  },
};
