import { GraphQLID, GraphQLInputObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL user profile input type definition */
export const UserProfileInputType = new GraphQLInputObjectType({
  name: 'UserProfileInputType',
  fields: () => ({
    favoriteApp: { type: GraphQLID },
    name: { type: GraphQLString },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    attributes: { type: GraphQLJSON },
  }),
});
