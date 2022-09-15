import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';

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
    name: { type: GraphQLString },
    // dataSource: { type: GraphQLID },
    sourceFields: { type: GraphQLJSON },
    pipeline: { type: GraphQLJSON },
    // mapping: { type: GraphQLJSON },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
  }),
});

/** GraphQL aggragatiom connection type definition */
export const AggregationConnectionType = Connection(AggregationType);
