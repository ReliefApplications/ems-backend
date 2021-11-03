import { GraphQLID, GraphQLInputObjectType, GraphQLString } from 'graphql';

export const UserProfileInputType = new GraphQLInputObjectType({
  name: 'UserProfileInputType',
  fields: () => ({
    favoriteApp: { type: GraphQLID },
    name: { type: GraphQLString },
  }),
});
