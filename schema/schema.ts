import { GraphQLSchema } from 'graphql';
import Query from './query';
import Mutation from './mutation';
import Subscription from './subscription';

export default new GraphQLSchema({
    query: Query,
    mutation: Mutation,
    subscription: Subscription
});
