import { GraphQLID } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { RecordType } from '../types';
import pubsub from '../../server/pubsub';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';

/**
 * Subscription to detect addition of record.
 */
export default {
  type: RecordType,
  args: {
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  subscribe: async (parent, args, context) => {
    const subscriber: AMQPPubSub = await pubsub();
    return withFilter(
      () => subscriber.asyncIterator('record_added'),
      (payload, variables) => {
        if (variables.resource) {
          return payload.recordAdded.resource === variables.resource;
        }
        if (variables.form) {
          return payload.recordAdded.form === variables.form;
        }
        return true;
      }
    )(parent, args, context);
  },
};
