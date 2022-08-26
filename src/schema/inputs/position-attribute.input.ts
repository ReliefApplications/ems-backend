import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';

/** GraphQL position attribute input type definition */
export const PositionAttributeInputType = new GraphQLInputObjectType({
  name: 'PositionAttributeInputType',
  fields: () => ({
    value: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLID) },
  }),
});
