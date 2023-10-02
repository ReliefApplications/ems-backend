import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** Aggregation type for queries/mutations argument */
export type AggregationArgs = {
  name: string;
  sourceFields: string[];
  pipeline: any;
  mapping?: any;
};

/** GraphQL Input Type of Aggregation */
export const AggregationInputType = new GraphQLInputObjectType({
  name: 'AggregationInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    // dataSource: { type: new GraphQLNonNull(GraphQLID) },
    sourceFields: { type: new GraphQLList(GraphQLString) },
    pipeline: { type: new GraphQLList(GraphQLJSON) },
    // mapping: { type: GraphQLJSON },
  }),
});
