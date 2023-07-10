import { GraphQLSchema } from 'graphql';
import Mutation from './mutation';
import Query from './query';
import Subscription from './subscription';
import config from 'config';

export default new GraphQLSchema(
  Object.assign(
    {
      query: Query,
      mutation: Mutation,
    },
    config.get('pubsub.enabled') ? { subscription: Subscription } : {}
  )
);
