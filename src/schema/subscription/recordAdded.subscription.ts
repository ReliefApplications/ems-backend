import { GraphQLID } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { RecordType } from '../types';
import pubsub from '../../server/pubsub';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the recordAdded subscription */
type RecordAddedArgs = {
  resource?: string | Types.ObjectId;
  form?: string | Types.ObjectId;
};
/**
 * Subscription to detect addition of record.
 */
export default {
  type: RecordType,
  args: {
    resource: { type: GraphQLID },
    form: { type: GraphQLID },
  },
  subscribe: async (parent, args: RecordAddedArgs, context: Context) => {
    const subscriber: RedisPubSub = await pubsub();
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
