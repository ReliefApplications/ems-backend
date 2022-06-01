import { GraphQLID, GraphQLInputObjectType, GraphQLString } from 'graphql';

/** GraphQL user profile input type definition */
export const UserProfileInputType = new GraphQLInputObjectType({
  name: 'UserProfileInputType',
  fields: () => ({
    favoriteApp: { type: GraphQLID },
    name: { type: GraphQLString },
  }),
});
