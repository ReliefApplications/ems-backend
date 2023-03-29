import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql';
import { Layer, Resource } from '@models';
import { Connection } from './pagination.type';
import { LayerTypeEnum, LayerDataSourceTypeEnum } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { AggregationType, LayoutType } from '.';
import { AppAbility } from '@security/defineUserAbility';

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
 * GraphQL LayerLayerSymbol type.
 */
export const LayerLayerSymbol = new GraphQLObjectType({
  name: 'LayerLayerSymbol',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL LayerDrawingInfo type.
 */
export const LayerDrawingInfo = new GraphQLObjectType({
  name: 'LayerDrawingInfo',
  fields: () => ({
    renderer: {
      type: new GraphQLObjectType({
        name: 'renderer',
        fields: () => ({
          type: { type: GraphQLNonNull(GraphQLString) },
          symbol: { type: LayerLayerSymbol },
          blur: { type: GraphQLNonNull(GraphQLFloat) },
          radius: { type: GraphQLNonNull(GraphQLFloat) },
          gradient: { type: GraphQLNonNull(GraphQLString) },
        }),
      }),
    },
  }),
});

/**
 * GraphQL LayerFeatureReduction type.
 */
export const LayerFeatureReduction = new GraphQLObjectType({
  name: 'LayerFeatureReduction',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    drawingInfo: { type: LayerDrawingInfo },
    clusterRadius: { type: GraphQLNonNull(GraphQLFloat) },
  }),
});

/**
 * GraphQL LayerDefinition type.
 */
export const LayerDefinition = new GraphQLObjectType({
  name: 'LayerDefinition',
  fields: () => ({
    minZoom: { type: GraphQLNonNull(GraphQLInt) },
    maxZoom: { type: GraphQLNonNull(GraphQLInt) },
    featureReduction: { type: LayerFeatureReduction },
    drawingInfo: { type: LayerDrawingInfo },
  }),
});

/**
 * GraphQL LayerPopupElementType type.
 */
export const LayerPopupElementType = new GraphQLObjectType({
  name: 'LayerPopupElementType',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    text: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL LayerPopupElementFields type.
 */
export const LayerPopupElementFields = new GraphQLObjectType({
  name: 'LayerPopupElementFields',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLNonNull(GraphQLString) },
    fields: { type: GraphQLList(GraphQLString) },
  }),
});

/**
 * GraphQL LayerPopupInfo type.
 */
export const LayerPopupInfo = new GraphQLObjectType({
  name: 'LayerPopupInfo',
  fields: () => ({
    PopupElementText: { type: LayerPopupElementType },
    PopupElementFields: { type: LayerPopupElementFields },
    type: { type: GraphQLNonNull(GraphQLString) },
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
    visibility: { type: GraphQLBoolean },
    opacity: { type: GraphQLNonNull(GraphQLFloat) },
    layerDefinition: { type: LayerDefinition },
    popupInfo: {
      type: new GraphQLObjectType({
        name: 'popupInfoData',
        fields: () => ({
          title: { type: GraphQLString },
          description: { type: GraphQLString },
          popupElements: { type: new GraphQLList(LayerPopupInfo) },
        }),
      }),
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    layerType: { type: LayerTypeEnum },
    datasource: { type: datasourceType },
  }),
});

/** GraphQL layer connection type definition */
export const LayerConnectionType = Connection(LayerType);
