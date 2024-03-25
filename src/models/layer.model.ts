import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteOne } from '@utils/models/deletion';

/**
 * PopupElementText interface.
 */
export interface PopupElementText {
  type: 'text';
  text?: string;
}

/**
 * PopupElementFields interface.
 */
export interface PopupElementFields {
  type: 'fields';
  title?: string;
  description?: string;
  fields?: string[];
}

/**
 * Layer Popup Fields type interface
 */
export interface FieldElement {
  label: string;
  name: string;
  type: string;
  [key: string]: string;
}

/**
 * PopupElementType type.
 */
export type PopupElementType = 'text' | 'fields';

/**
 * PopupElement interface.
 */
export interface PopupElement
  extends Omit<PopupElementText, 'type'>,
    Omit<PopupElementFields, 'type'> {
  type: PopupElementType;
}

/**
 * LayerSymbolOutline interface.
 */
export type LayerSymbolOutline = {
  color: string;
  width: number;
};

/**
 * LayerSymbol interface.
 */
export type LayerSymbol = {
  color: string;
  size: number;
  style: string;
  outline?: LayerSymbolOutline;
};

/**
 * DrawingInfo interface.
 */
export interface DrawingInfo {
  renderer?: {
    type?: string;
    symbol?: LayerSymbol;
    blur?: number;
    radius?: number;
    gradient?: string;
  };
}

/**
 * FeatureReduction interface.
 */
export interface FeatureReduction {
  type: 'cluster';
  drawingInfo?: DrawingInfo;
  clusterRadius?: number;
  lightMode?: boolean;
  fontSize?: number;
  autoSizeCluster?: boolean;
  defaultClusterSize?: number;
}

/**
 * LayerDefinition interface.
 */
export interface LayerDefinition {
  minZoom?: number;
  maxZoom?: number;
  featureReduction?: FeatureReduction;
  // Symbol
  drawingInfo?: DrawingInfo;
}

/** Allowed geometry types */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum GeometryType {
  POINT = 'Point',
  POLYGON = 'Polygon',
}

/**
 * Layer Datasource interface
 */
export interface LayerDatasource {
  resource?: mongoose.Types.ObjectId;
  refData?: mongoose.Types.ObjectId;
  referenceDataVariableMapping?: string;
  layout?: mongoose.Types.ObjectId;
  aggregation?: mongoose.Types.ObjectId;
  geoField?: string;
  adminField?: string;
  latitudeField?: string;
  longitudeField?: string;
  type: GeometryType;
}

/** Layer documents interface declaration */
export interface Layer extends Document {
  kind: 'Layer';
  name: string;
  type: string;
  sublayers?: any[];
  createdAt: Date;
  modifiedAt: Date;
  visibility: boolean;
  datasource?: LayerDatasource;
  opacity: number;
  layerDefinition?: LayerDefinition;
  popupInfo?: PopupElement[];
  contextFilters: string;
  at: string;
}

/** Mongoose layer schema declaration */
const layerSchema = new Schema(
  {
    name: String,
    type: String,
    sublayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Layer',
      },
    ],
    visibility: Boolean,
    opacity: Number,
    layerDefinition: {
      minZoom: Number,
      maxZoom: Number,
      featureReduction: mongoose.Schema.Types.Mixed,
      drawingInfo: mongoose.Schema.Types.Mixed,
    },
    popupInfo: {
      title: String,
      description: String,
      popupElements: [mongoose.Schema.Types.Mixed],
      fieldsInfo: [mongoose.Schema.Types.Mixed],
    },
    datasource: {
      resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
      },
      refData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReferenceData',
      },
      referenceDataVariableMapping: String,
      layout: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Layout',
      },
      aggregation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Aggregation',
      },
      geoField: String,
      adminField: String,
      latitudeField: String,
      longitudeField: String,
      type: {
        type: String,
        enum: Object.values(GeometryType),
      },
    },
    contextFilters: String,
    at: String,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// handle cascading deletion of sublayer
addOnBeforeDeleteOne(layerSchema, async (layer) => {
  const layers = await Layer.find({
    sublayers: { $elemMatch: { $eq: layer.id } },
  });
  for await (const layerData of layers) {
    await Layer.updateOne(
      { _id: layerData._id },
      { $pull: { sublayers: layer.id } }
    );
  }
});

/** Mongoose layer model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Layer = mongoose.model<Layer, AccessibleRecordModel<Layer>>(
  'Layer',
  layerSchema
);
