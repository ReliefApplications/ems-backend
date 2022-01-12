import { GraphQLError, GraphQLID } from 'graphql';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../server/pubsub';
import errors from '../../const/errors';
import { ApplicationType } from '../types';

export default {
  type: ApplicationType,
  args: {
    id: { type: GraphQLID },
  },
  subscribe: async (parent, args, context) => {
    const subscriber: AMQPPubSub = await pubsub();
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
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
