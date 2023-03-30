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

/** GraphQL Layer Symbol inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerLayerSymbolInputType = new GraphQLInputObjectType({
  name: 'LayerLayerSymbolInputType',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/** GraphQL Layer DrawingInfo inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDrawingInfoInputType = new GraphQLInputObjectType({
  name: 'LayerDrawingInfoInputType',
  fields: () => ({
    renderer: {
      type: new GraphQLInputObjectType({
        name: 'rendererInputType',
        fields: () => ({
          type: { type: GraphQLNonNull(GraphQLString) },
          symbol: { type: new GraphQLNonNull(LayerLayerSymbolInputType) },
          blur: { type: GraphQLNonNull(GraphQLFloat) },
          radius: { type: GraphQLNonNull(GraphQLFloat) },
          gradient: { type: GraphQLNonNull(GraphQLString) },
        }),
      }),
    },
  }),
});

/** GraphQL Layer Feature Reduction inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerFeatureReductionInputType = new GraphQLInputObjectType({
  name: 'LayerFeatureReductionInputType',
  fields: () => ({
    type: { type: new GraphQLNonNull(GraphQLString) },
    drawingInfo: { type: new GraphQLNonNull(LayerDrawingInfoInputType) },
    clusterRadius: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
});

/** GraphQL Layer Definition inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerDefinitionInputType = new GraphQLInputObjectType({
  name: 'LayerDefinitionInputType',
  fields: () => ({
    minZoom: { type: GraphQLNonNull(GraphQLInt) },
    maxZoom: { type: GraphQLNonNull(GraphQLInt) },
    featureReduction: {
      type: new GraphQLNonNull(LayerFeatureReductionInputType),
    },
    drawingInfo: { type: new GraphQLNonNull(LayerDrawingInfoInputType) },
  }),
});

/** GraphQL Layer Popup Element Type inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const LayerPopupElementTypeInputType = new GraphQLInputObjectType({
  name: 'LayerPopupElementTypeInputType',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    text: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/** GraphQL Layer Popup Element Fields inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerPopupElementFieldsInputType = new GraphQLInputObjectType({
  name: 'LayerPopupElementFieldsInputType',
  fields: () => ({
    type: { type: GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLNonNull(GraphQLString) },
    fields: { type: GraphQLList(GraphQLString) },
  }),
});

/** GraphQL Layer Popup Elements inpupt type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerPopupElementsInputType = new GraphQLInputObjectType({
  name: 'LayerPopupElementsInputType',
  fields: () => ({
    PopupElementText: { type: LayerPopupElementTypeInputType },
    PopupElementFields: { type: LayerPopupElementFieldsInputType },
    type: { type: GraphQLNonNull(GraphQLString) },
  }),
});

/** GraphQL Input Type of Layer */
const LayerInputType = new GraphQLInputObjectType({
  name: 'LayerInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
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
          popupElements: { type: new GraphQLList(LayerPopupElementsInputType) },
        }),
      }),
    },
  }),
});

export default LayerInputType;
