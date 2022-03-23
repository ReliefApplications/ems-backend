import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceDataTypeEnumType } from '../../const/enumTypes';
import { ReferenceData, ApiConfiguration } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { ApiConfigurationType } from './apiConfiguration';
import { AccessType } from './access';
import { Connection } from './pagination';

export const ReferenceDataType = new GraphQLObjectType({
  name: 'ReferenceData',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: ReferenceDataTypeEnumType },
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
    query: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLString) },
    valueField: { type: GraphQLString },
    path: { type: GraphQLString },
    data: { type: GraphQLJSON },
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
