import { GraphQLSchema } from 'graphql';
import Mutation from './mutation';
import Query from './query';
import Subscription from './subscription';

export default new GraphQLSchema({
  query: Query,
  mutation: Mutation,
  subscription: Subscription,
});
