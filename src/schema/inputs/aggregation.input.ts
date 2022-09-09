import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL Input Type of Aggregation */
const AggregationInputType = new GraphQLInputObjectType({
  name: 'AggregationInputType',
  fields: () => ({
    dataSource: { type: new GraphQLNonNull(GraphQLID) },
    sourceFields: { type: new GraphQLList(GraphQLString) },
    pipeline: { type: new GraphQLList(new GraphQLList(GraphQLJSON)) },
    mapping: { type: GraphQLJSON },
  }),
});

export default AggregationInputType;
