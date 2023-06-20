/* eslint-disable @typescript-eslint/naming-convention */
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
import { Connection } from './pagination.type';
import { LayerTypeEnum } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL datasourceType type.
 */
const LayerDatasource = new GraphQLObjectType({
  name: 'LayerDatasource',
  fields: () => ({
    refData: { type: GraphQLID },
    resource: { type: GraphQLID },
    layout: { type: GraphQLID },
    aggregation: { type: GraphQLID },
    geoField: { type: GraphQLString },
    latitudeField: { type: GraphQLString },
    longitudeField: { type: GraphQLString },
  }),
});

/**
 * GraphQL LayerSymbol type.
 */
const LayerSymbol = new GraphQLObjectType({
  name: 'LayerSymbol',
  fields: () => ({
    color: { type: new GraphQLNonNull(GraphQLString) },
    size: { type: new GraphQLNonNull(GraphQLFloat) },
    style: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

/**
 * GraphQL LayerUniqueValue Info type.
 */
const LayerUniqueValueInfo = new GraphQLObjectType({
  name: 'LayerUniqueValueInfo',
  fields: () => ({
    label: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(LayerSymbol) },
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
          type: { type: new GraphQLNonNull(GraphQLString) },
          symbol: { type: LayerSymbol },
          blur: { type: GraphQLFloat },
          radius: { type: GraphQLFloat },
          gradient: { type: GraphQLJSON },
          minOpacity: { type: GraphQLFloat },
          defaultLabel: { type: GraphQLString },
          defaultSymbol: { type: LayerSymbol },
          field1: { type: GraphQLString },
          uniqueValueInfos: {
            type: new GraphQLList(LayerUniqueValueInfo),
          },
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
    type: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    text: { type: GraphQLString },
    fields: {
      type: new GraphQLList(GraphQLString),
      resolve: (parent) => parent.fields ?? [],
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
    type: { type: GraphQLString },
    sublayers: { type: GraphQLJSON },
    visibility: { type: GraphQLBoolean },
    opacity: { type: new GraphQLNonNull(GraphQLFloat) },
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
