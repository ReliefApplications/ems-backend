import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL Aggregation type.
 */
export const AggregationType = new GraphQLObjectType({
  name: 'Aggregation',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    dataSource: { type: GraphQLID },
    sourceFields: { type: GraphQLJSON },
    pipeline: { type: GraphQLJSON },
    mapping: { type: GraphQLJSON },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
  }),
});
