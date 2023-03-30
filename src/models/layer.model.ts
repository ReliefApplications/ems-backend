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
 * LayerSymbol interface.
 */

export type LayerSymbol = {
  color: string;
  size: number;
  style: string;
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

/**
 * Layer Datasource interface
 */
export interface LayerDatasource {
  type: string;
  layout?: mongoose.Types.ObjectId;
  aggregation?: mongoose.Types.ObjectId;
}

/** Layer documents interface declaration */
export interface Layer extends Document {
  kind: 'Layer';
  name: string;
  sublayers?: any[];
  createdAt: Date;
  modifiedAt: Date;
  visibility: boolean;
  datasource?: LayerDatasource;
  opacity: number;
  layerDefinition?: LayerDefinition;
  popupInfo?: PopupElement[];
}

/** Mongoose layer schema declaration */
const layerSchema = new Schema(
  {
    name: String,
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
      layout: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Layout',
      },
      aggregation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Aggregation',
      },
    },
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
