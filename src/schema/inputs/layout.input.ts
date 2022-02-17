import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

const LayoutQueryInputType = new GraphQLInputObjectType({
  name: 'LayoutQueryInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    template: { type: GraphQLID },
    filter: { type: GraphQLJSON },
    fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLJSON)) },
    sort: { type: GraphQLJSON },
  }),
});

/**
 * GraphQL Input Type of Layout.
 */
const LayoutInputType = new GraphQLInputObjectType({
  name: 'LayoutInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    query: { type: new GraphQLNonNull(LayoutQueryInputType) },
  }),
});

export default LayoutInputType;
