import { GraphQLObjectType, GraphQLString, GraphQLBoolean } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';
import GraphQLJSON from 'graphql-type-json';
import { AppAbility } from '../../security/defineAbilityFor';
import { ApiConfiguration } from '../../models';
import { ApiConfigurationType } from './apiConfiguration';

/** GraphQL UserManagement type definition */
export const UserManagementType = new GraphQLObjectType({
  name: 'UserManagement',
  fields: () => ({
    local: { type: GraphQLBoolean },
    apiConfiguration: {
      type: ApiConfigurationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ApiConfiguration.findById(parent.apiConfiguration).accessibleBy(
          ability,
          'read'
        );
      },
    },
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
