import { GraphQLID } from 'graphql';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Subscription to detect if application is unlocked.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (parent, args, context) => {
    graphQLAuthCheck(context);
    const subscriber: AMQPPubSub = await pubsub();
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
