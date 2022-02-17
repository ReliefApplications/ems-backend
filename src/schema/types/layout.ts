import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL Layout type.
 */
export const LayoutType = new GraphQLObjectType({
  name: 'Layout',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    query: { type: GraphQLJSON },
  }),
});
