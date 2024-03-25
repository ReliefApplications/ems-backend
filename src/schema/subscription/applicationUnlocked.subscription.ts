import { GraphQLID } from 'graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the applicationUnlocked subscription */
type ApplicationUnlockedArgs = {
  id?: string | Types.ObjectId;
};

/**
 * Subscription to detect if application is unlocked.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (
    parent,
    args: ApplicationUnlockedArgs,
    context: Context
  ) => {
    graphQLAuthCheck(context);
    const subscriber: RedisPubSub = await pubsub();
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
