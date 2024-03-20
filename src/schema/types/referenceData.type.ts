import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { ReferenceDataTypeEnumType } from '@const/enumTypes';
import { ReferenceData, ApiConfiguration } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { ApiConfigurationType } from './apiConfiguration.type';
import { AccessType } from './access.type';
import { Connection, encodeCursor } from './pagination.type';
import { accessibleBy } from '@casl/mongoose';
import { AggregationConnectionType } from './aggregation.type';

/** Default page size */
const DEFAULT_FIRST = 10;

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
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const apiConfig = await ApiConfiguration.findOne({
          _id: parent.apiConfiguration,
          ...accessibleBy(ability, 'read').ApiConfiguration,
        });
        return apiConfig;
      },
    },
    graphQLTypeName: { type: GraphQLString },
    query: { type: GraphQLString },
    fields: { type: GraphQLJSON },
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
    aggregations: {
      type: AggregationConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        ids: { type: new GraphQLList(GraphQLID) },
      },
      resolve(parent, args) {
        let start = 0;
        const first = args.first || DEFAULT_FIRST;
        let allEdges = parent.aggregations.map((x) => ({
          cursor: encodeCursor(x.id.toString()),
          node: x,
        }));
        if (args.ids && args.ids.length > 0) {
          allEdges = allEdges.filter((x) => args.ids.includes(x.node.id));
        }
        const totalCount = allEdges.length;
        if (args.afterCursor) {
          start = allEdges.findIndex((x) => x.cursor === args.afterCursor) + 1;
        }
        let edges = allEdges.slice(start, start + first + 1);
        const hasNextPage = edges.length > first;
        if (hasNextPage) {
          edges = edges.slice(0, edges.length - 1);
        }
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount,
        };
      },
    },
    pageInfo: {
      type: new GraphQLObjectType({
        name: 'ReferenceDataPaginationDefinition',
        fields: () => ({
          strategy: { type: GraphQLString },
          cursorField: { type: GraphQLString },
          cursorVar: { type: GraphQLString },
          offsetVar: { type: GraphQLString },
          pageVar: { type: GraphQLString },
          pageSizeVar: { type: GraphQLString },
          totalCountField: { type: GraphQLString },
        }),
      }),
    },
  }),
});

/** Connection type of reference data. For pagination. */
export const ReferenceDataConnectionType = Connection(ReferenceDataType);
