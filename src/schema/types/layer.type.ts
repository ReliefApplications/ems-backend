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
const LayerDatasource = new GraphQLObjectType({
  name: 'LayerDatasource',
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
 * GraphQL LayerSymbol type.
 */
const LayerSymbol = new GraphQLObjectType({
  name: 'LayerSymbol',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL LayerDrawingInfo type.
 */
const LayerDrawingInfo = new GraphQLObjectType({
  name: 'LayerDrawingInfo',
  fields: () => ({
    renderer: {
      type: new GraphQLObjectType({
        name: 'renderer',
        fields: () => ({
          type: { type: GraphQLNonNull(GraphQLString) },
          symbol: { type: LayerSymbol },
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
 * GraphQL LayerFeatureReduction type.
 */
const LayerFeatureReduction = new GraphQLObjectType({
  name: 'LayerFeatureReduction',
  fields: () => ({
    type: { type: GraphQLString },
    drawingInfo: { type: LayerDrawingInfo },
    clusterRadius: { type: GraphQLFloat },
  }),
});

/**
 * GraphQL LayerDefinition type.
 */
const LayerDefinition = new GraphQLObjectType({
  name: 'LayerDefinition',
  fields: () => ({
    minZoom: { type: GraphQLInt },
    maxZoom: { type: GraphQLInt },
    featureReduction: { type: LayerFeatureReduction },
    drawingInfo: { type: LayerDrawingInfo },
  }),
});

/**
 * GraphQL LayerPopupElement type.
 */
const LayerPopupElement = new GraphQLObjectType({
  name: 'LayerPopupElement',
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
    layerDefinition: { type: LayerDefinition },
    popupInfo: {
      type: new GraphQLObjectType({
        name: 'popupInfoData',
        fields: () => ({
          title: { type: GraphQLString },
          description: { type: GraphQLString },
          popupElements: { type: new GraphQLList(LayerPopupElement) },
        }),
      }),
    },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    layerType: { type: LayerTypeEnum },
    datasource: { type: LayerDatasource },
  }),
});

/** GraphQL layer connection type definition */
export const LayerConnectionType = Connection(LayerType);
