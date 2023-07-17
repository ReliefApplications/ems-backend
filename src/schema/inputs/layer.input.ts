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
    color: { type: GraphQLNonNull(GraphQLString) },
    width: { type: GraphQLNonNull(GraphQLFloat) },
  }),
});

/** GraphQL Layer Symbol input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerSymbolInputType = new GraphQLInputObjectType({
  name: 'LayerSymbolInputType',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
    outline: { type: LayerSymbolOutlineInputType },
  }),
});

/** GraphQL Layer Unique Value Info input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerUniqueValueInfoInputType = new GraphQLInputObjectType({
  name: 'LayerUniqueValueInfoInputType',
  fields: () => ({
    label: { type: GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLNonNull(GraphQLString) },
    symbol: { type: GraphQLNonNull(LayerSymbolInputType) },
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
          type: { type: GraphQLNonNull(GraphQLString) },
          symbol: { type: LayerSymbolInputType },
          blur: { type: GraphQLFloat },
          radius: { type: GraphQLFloat },
          minOpacity: { type: GraphQLFloat },
          gradient: { type: GraphQLList(LayerGradientStepInputType) },
          defaultLabel: { type: GraphQLString },
          defaultSymbol: { type: LayerSymbolInputType },
          field1: { type: GraphQLString },
          uniqueValueInfos: {
            type: GraphQLList(LayerUniqueValueInfoInputType),
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
    type: { type: GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    text: { type: GraphQLString },
    fields: { type: GraphQLList(GraphQLString) },
  }),
});

/** GraphQL Layer Datasource input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDataSourceInputType = new GraphQLInputObjectType({
  name: 'LayerDataSourceInputType',
  fields: () => ({
    refData: { type: GraphQLID },
    resource: { type: GraphQLID },
    layout: { type: GraphQLID },
    aggregation: { type: GraphQLID },
    geoField: { type: GraphQLString },
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
          fieldsInfo: { type: GraphQLList(FieldElementInputType) },
        }),
      }),
    },
    datasource: { type: LayerDataSourceInputType },
    contextFilters: { type: GraphQLString },
  }),
});

export default LayerInputType;
