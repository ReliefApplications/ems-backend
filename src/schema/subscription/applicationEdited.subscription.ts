import { GraphQLID } from 'graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the applicationEdited subscription */
type ApplicationEditedArgs = {
  id?: string | Types.ObjectId;
};

/**
 * Subscription to detect if application is being edited.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (parent, args: ApplicationEditedArgs, context: Context) => {
    graphQLAuthCheck(context);
    const subscriber: RedisPubSub = await pubsub();
    const user = context.user;
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
