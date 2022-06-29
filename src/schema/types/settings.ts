import { GraphQLObjectType, GraphQLString, GraphQLBoolean } from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL UserManagement type definition */
export const UserManagementType = new GraphQLObjectType({
  name: 'UserManagement',
  fields: () => ({
    localAuthentication: { type: GraphQLBoolean },
    serviceAPI: { type: GraphQLString },
    attributesMapping: { type: GraphQLJSON },
  }),
});

/** GraphQL Settings type definition */
export const SettingsType = new GraphQLObjectType({
  name: 'Settings',
  fields: () => ({
    userManagement: {
      type: UserManagementType,
    },
  }),
});
