import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { StatusEnumType, AuthEnumType } from '@const/enumTypes';
import { ApiConfiguration } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { AccessType } from './access.type';
import * as CryptoJS from 'crypto-js';
import { Connection } from './pagination.type';
import config from 'config';

/** GraphQL api configuration type definition */
export const ApiConfigurationType = new GraphQLObjectType({
  name: 'ApiConfiguration',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    authType: { type: AuthEnumType },
    endpoint: { type: GraphQLString },
    graphQLEndpoint: { type: GraphQLString },
    pingUrl: { type: GraphQLString },
    settings: {
      type: GraphQLJSON,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (parent.settings && ability.can('read', parent)) {
          const settings = JSON.parse(
            CryptoJS.AES.decrypt(
              parent.settings,
              config.get('encryption.key')
            ).toString(CryptoJS.enc.Utf8)
          );
          for (const key in settings) {
            if (settings[key].length > 0) {
              settings[key] = true;
            }
          }
          return settings;
        }
        return null;
      },
    },
    permissions: {
      type: AccessType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    canSee: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('read', new ApiConfiguration(parent));
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', new ApiConfiguration(parent));
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('delete', new ApiConfiguration(parent));
      },
    },
  }),
});

/** GraphQL api configuration connection type definition */
export const ApiConfigurationConnectionType = Connection(ApiConfigurationType);
