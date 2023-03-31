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
import { Layer, ReferenceData, Resource } from '@models';
import { Connection } from './pagination.type';
import { LayerTypeEnum } from '@const/enumTypes';
import {
  AggregationType,
  LayoutType,
  ResourceType,
  ReferenceDataType,
} from '.';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL datasourceType type.
 */
const layerDatasource = new GraphQLObjectType({
  name: 'layerDatasource',
  fields: () => ({
    resource: {
      type: ResourceType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (parent.resource) {
          return Resource.findById(parent.resource).accessibleBy(
            ability,
            'read'
          );
        } else {
          return null;
        }
      },
    },
    refData: {
      type: ReferenceDataType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (parent.refData) {
          return ReferenceData.findById(parent.refData).accessibleBy(
            ability,
            'read'
          );
        } else {
          return null;
        }
      },
    },
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
 * GraphQL layerSymbol type.
 */
const layerSymbol = new GraphQLObjectType({
  name: 'layerSymbol',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL layerDrawingInfo type.
 */
const layerDrawingInfo = new GraphQLObjectType({
  name: 'layerDrawingInfo',
  fields: () => ({
    renderer: {
      type: new GraphQLObjectType({
        name: 'renderer',
        fields: () => ({
          type: { type: GraphQLNonNull(GraphQLString) },
          symbol: { type: layerSymbol },
          blur: { type: GraphQLFloat },
          radius: { type: GraphQLFloat },
          gradient: { type: GraphQLJSON },
          minOpacity: { type: GraphQLFloat },
        }),
      }),
    },
  }),
});

/**
 * GraphQL layerFeatureReduction type.
 */
const layerFeatureReduction = new GraphQLObjectType({
  name: 'layerFeatureReduction',
  fields: () => ({
    type: { type: GraphQLString },
    drawingInfo: { type: layerDrawingInfo },
    clusterRadius: { type: GraphQLFloat },
  }),
});

/**
 * GraphQL layerDefinition type.
 */
const layerDefinition = new GraphQLObjectType({
  name: 'layerDefinition',
  fields: () => ({
    minZoom: { type: GraphQLInt },
    maxZoom: { type: GraphQLInt },
    featureReduction: { type: layerFeatureReduction },
    drawingInfo: { type: layerDrawingInfo },
  }),
});

/**
 * GraphQL layerPopupElement type.
 */
const layerPopupElement = new GraphQLObjectType({
  name: 'layerPopupElement',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    text: { type: GraphQLString },
    fields: { type: GraphQLList(GraphQLString) },
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
    layerDefinition: { type: layerDefinition },
    popupInfo: {
      type: new GraphQLObjectType({
        name: 'popupInfoData',
        fields: () => ({
          title: { type: GraphQLString },
          description: { type: GraphQLString },
          popupElements: { type: new GraphQLList(layerPopupElement) },
        }),
      }),
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    layerType: { type: LayerTypeEnum },
    datasource: { type: layerDatasource },
  }),
});

/** GraphQL layer connection type definition */
export const LayerConnectionType = Connection(LayerType);
