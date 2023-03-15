import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import { Layer, Resource } from '@models';
import { Connection } from './pagination.type';
import { LayerTypeEnum, LayerDataSourceTypeEnum } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { AggregationType, LayoutType } from '.';
import { AppAbility } from '@security/defineUserAbility';

/**
 * GraphQL LayerDefinition type.
 */
const layerDefinitionType = new GraphQLObjectType({
  name: 'LayerDefinition',
  fields: () => ({
    featureReduction: { type: GraphQLJSON },
    drawingInfo: { type: GraphQLJSON },
  }),
});

/**
 * GraphQL popupInfoType type.
 */
const popupInfoType = new GraphQLObjectType({
  name: 'PopupInfo',
  fields: () => ({
    popupElements: { type: GraphQLJSON },
    description: { type: GraphQLString },
  }),
});

/**
 * GraphQL datasourceType type.
 */
const datasourceType = new GraphQLObjectType({
  name: 'Datasource',
  fields: () => ({
    type: { type: LayerDataSourceTypeEnum },
    layout: {
      type: LayoutType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Resource.findOne({
          layouts: {
            $elemMatch: { _id: parent.datasource.layout },
          },
        }).accessibleBy(ability, 'read');
      },
    },
    aggregation: {
      type: AggregationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Resource.findOne({
          aggregations: {
            $elemMatch: { _id: parent.datasource.aggregation },
          },
        }).accessibleBy(ability, 'read');
      },
    },
  }),
});

/**
 * GraphQL Layer type.
 */
export const LayerType = new GraphQLObjectType({
  name: 'Layer',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    sublayers: {
      type: new GraphQLList(LayerType),
      async resolve(parent) {
        return Layer.find({ _id: { $in: parent.sublayers } });
      },
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    visibility: { type: GraphQLBoolean },
    layerType: { type: LayerTypeEnum },
    layerDefinition: { type: layerDefinitionType },
    popupInfo: { type: popupInfoType },
    datasource: { type: datasourceType },
  }),
});

/** GraphQL layer connection type definition */
export const LayerConnectionType = Connection(LayerType);
