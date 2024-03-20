import { GraphQLID, GraphQLInputObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** UserProfile type for queries/mutations argument */
export type UserProfileArgs = {
  favoriteApp?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  attributes?: any;
};

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
