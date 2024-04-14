import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/** GraphQL Input Type of id shape */
export const IdShapeType = new GraphQLInputObjectType({
  name: 'IdShapeType',
  fields: () => ({
    shape: { type: new GraphQLNonNull(GraphQLString) },
    padding: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});
