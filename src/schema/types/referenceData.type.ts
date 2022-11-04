import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceDataTypeEnumType } from '@const/enumTypes';
import { ReferenceData, ApiConfiguration } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ApiConfigurationType } from './apiConfiguration.type';
import { AccessType } from './access.type';
import { Connection } from './pagination.type';

/**
 * GraphQL type of Reference Data.
 */
export const ReferenceDataType = new GraphQLObjectType({
  name: 'ReferenceData',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
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
    graphQLFilter: { type: GraphQLString },
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

/** Connection type of reference data. For pagination. */
export const ReferenceDataConnectionType = Connection(ReferenceDataType);
