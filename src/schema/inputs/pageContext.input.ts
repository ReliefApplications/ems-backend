import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';

/** GraphQL Input Type for the page context */
export const PageContextInputType = new GraphQLInputObjectType({
  name: 'PageContextInputType',
  fields: () => ({
    refData: { type: GraphQLID },
    resource: { type: GraphQLID },
    displayField: { type: new GraphQLNonNull(GraphQLString) },
  }),
});
