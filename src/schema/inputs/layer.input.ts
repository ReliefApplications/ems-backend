import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
} from 'graphql';

/** GraphQL Layer Symbol outline input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerSymbolOutlineInputType = new GraphQLInputObjectType({
  name: 'LayerSymbolOutlineInputType',
  fields: () => ({
    color: { type: new GraphQLNonNull(GraphQLString) },
    width: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

/** GraphQL Layer Symbol input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerSymbolInputType = new GraphQLInputObjectType({
  name: 'LayerSymbolInputType',
  fields: () => ({
    color: { type: new GraphQLNonNull(GraphQLString) },
    size: { type: new GraphQLNonNull(GraphQLFloat) },
    style: { type: new GraphQLNonNull(GraphQLString) },
    outline: { type: LayerSymbolOutlineInputType },
  }),
});

/** GraphQL Layer Unique Value Info input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerUniqueValueInfoInputType = new GraphQLInputObjectType({
  name: 'LayerUniqueValueInfoInputType',
  fields: () => ({
    label: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(LayerSymbolInputType) },
  }),
});

/** GraphQL Layer Gradient step input type definition (for heatmap) */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerGradientStepInputType = new GraphQLInputObjectType({
  name: 'LayerGradientStepInputType',
  fields: () => ({
    color: { type: GraphQLString },
    ratio: { type: GraphQLFloat },
  }),
});

/** GraphQL Layer DrawingInfo input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDrawingInfoInputType = new GraphQLInputObjectType({
  name: 'LayerDrawingInfoInputType',
  fields: () => ({
    renderer: {
      type: new GraphQLInputObjectType({
        name: 'rendererInputType',
        fields: () => ({
          type: { type: new GraphQLNonNull(GraphQLString) },
          symbol: { type: LayerSymbolInputType },
          blur: { type: GraphQLFloat },
          radius: { type: GraphQLFloat },
          minOpacity: { type: GraphQLFloat },
          gradient: { type: new GraphQLList(LayerGradientStepInputType) },
          defaultLabel: { type: GraphQLString },
          defaultSymbol: { type: LayerSymbolInputType },
          field1: { type: GraphQLString },
          uniqueValueInfos: {
            type: new GraphQLList(LayerUniqueValueInfoInputType),
          },
        }),
      }),
    },
  }),
});

/** GraphQL Layer Feature Reduction input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerFeatureReductionInputType = new GraphQLInputObjectType({
  name: 'LayerFeatureReductionInputType',
  fields: () => ({
    type: { type: GraphQLString },
    drawingInfo: { type: LayerDrawingInfoInputType },
    clusterRadius: { type: GraphQLFloat },
    lightMode: { type: GraphQLBoolean },
    fontSize: { type: GraphQLInt },
    autoSizeCluster: { type: GraphQLBoolean },
    defaultClusterSize: { type: GraphQLInt },
  }),
});

/** GraphQL Layer Definition input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDefinitionInputType = new GraphQLInputObjectType({
  name: 'LayerDefinitionInputType',
  fields: () => ({
    minZoom: { type: GraphQLInt },
    maxZoom: { type: GraphQLInt },
    featureReduction: {
      type: LayerFeatureReductionInputType,
    },
    drawingInfo: { type: LayerDrawingInfoInputType },
  }),
});

/** GraphQL Fields Element Definition input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const FieldElementInputType = new GraphQLInputObjectType({
  name: 'FieldElementInputType',
  fields: () => ({
    label: { type: GraphQLString },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
  }),
});

/** GraphQL Layer Popup Element Fields input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerPopupElementInputType = new GraphQLInputObjectType({
  name: 'LayerPopupElementFieldsInputType',
  fields: () => ({
    type: { type: new GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    text: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLString) },
  }),
});

/** GraphQL Layer Datasource input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDataSourceInputType = new GraphQLInputObjectType({
  name: 'LayerDataSourceInputType',
  fields: () => ({
    refData: { type: GraphQLID },
    referenceDataVariableMapping: { type: GraphQLString },
    resource: { type: GraphQLID },
    layout: { type: GraphQLID },
    aggregation: { type: GraphQLID },
    geoField: { type: GraphQLString },
    adminField: { type: GraphQLString },
    latitudeField: { type: GraphQLString },
    longitudeField: { type: GraphQLString },
    type: { type: GraphQLString },
  }),
});

/** GraphQL Input Type of Layer */
const LayerInputType = new GraphQLInputObjectType({
  name: 'LayerInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: GraphQLString },
    sublayers: { type: new GraphQLList(GraphQLID) },
    visibility: { type: GraphQLBoolean },
    opacity: { type: GraphQLFloat },
    layerDefinition: { type: LayerDefinitionInputType },
    popupInfo: {
      type: new GraphQLInputObjectType({
        name: 'popupInfoDataInputType',
        fields: () => ({
          title: { type: GraphQLString },
          description: { type: GraphQLString },
          popupElements: { type: new GraphQLList(LayerPopupElementInputType) },
          fieldsInfo: { type: new GraphQLList(FieldElementInputType) },
        }),
      }),
    },
    datasource: { type: LayerDataSourceInputType },
    contextFilters: { type: GraphQLString },
    at: { type: GraphQLString },
  }),
});

export default LayerInputType;
