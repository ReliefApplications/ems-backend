import { GraphQLID } from 'graphql';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Subscription to detect if application is being edited.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (parent, args, context) => {
    const subscriber: AMQPPubSub = await pubsub();
    const user = context.user;
    checkUserAuthenticated(user);
    return withFilter(
      () => subscriber.asyncIterator('app_edited'),
      (payload, variables) => {
        if (variables.id) {
          return (
            payload.application._id === variables.id &&
            payload.user !== user._id.toString()
          );
        }
        return false;
      }
    )(parent, args, context);
  },
  resolve: (payload) => {
    return payload.application;
  },
};
