import { GraphQLObjectType, GraphQLString, GraphQLBoolean } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL UserManagement type definition */
export const UserManagementType = new GraphQLObjectType({
  name: 'UserManagement',
  fields: () => ({
    local: { type: GraphQLBoolean },
    serviceAPI: { type: GraphQLString },
    attributesMapping: { type: GraphQLJSON },
  }),
});

/** GraphQL Settings type definition */
export const SettingType = new GraphQLObjectType({
  name: 'Setting',
  fields: () => ({
    userManagement: {
      type: UserManagementType,
    },
    modifiedAt: { type: GraphQLDateTime },
  }),
});
