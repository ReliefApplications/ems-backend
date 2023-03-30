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

/** GraphQL Layer Symbol input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const LayerLayerSymbolInputType = new GraphQLInputObjectType({
  name: 'LayerLayerSymbolInputType',
  fields: () => ({
    color: { type: GraphQLNonNull(GraphQLString) },
    size: { type: GraphQLNonNull(GraphQLFloat) },
    style: { type: GraphQLNonNull(GraphQLString) },
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
          symbol: { type: LayerLayerSymbolInputType },
          blur: { type: GraphQLFloat },
          radius: { type: GraphQLFloat },
          gradient: { type: GraphQLString },
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
          popupElements: { type: new GraphQLList(LayerPopupElementInputType) },
        }),
      }),
    },
    datasource: { type: LayerDataSourceInputType },
  }),
});

export default LayerInputType;
