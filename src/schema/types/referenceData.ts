import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { StatusEnumType, AuthEnumType } from '../../const/enumTypes';
import { ReferenceData } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { AccessType } from './access';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import { Connection } from './pagination';

dotenv.config();

export const ReferenceDataType = new GraphQLObjectType({
  name: 'ReferenceData',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    authType: { type: AuthEnumType },
    endpoint: { type: GraphQLString },
    pingUrl: { type: GraphQLString },
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
        return ability.can('read', new ReferenceData(parent));
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', new ReferenceData(parent));
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('delete', new ReferenceData(parent));
      },
    },
  }),
});

export const ReferenceDataConnectionType = Connection(ReferenceDataType);
