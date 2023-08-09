import { GraphQLError, GraphQLID } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { RedisPubSub } from 'graphql-redis-subscriptions';

/**
 * Subscription to detect if application is unlocked.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (parent, args, context) => {
    const subscriber: RedisPubSub = await pubsub();
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    return withFilter(
      () => subscriber.asyncIterator('app_lock'),
      (payload, variables) => {
        if (variables.id) {
          return payload.application._id === variables.id;
        }
        return false;
      }
    )(parent, args, context);
  },
  resolve: (payload) => {
    return payload.application;
  },
};
