import { AccessibleRecordModel } from '@casl/mongoose';
import { layerDataSourceType, layerType } from '@const/enumTypes';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteOne } from '@utils/models/deletion';
export interface PopupElementText {
  type: 'text';
  text?: string;
}

export interface PopupElementFields {
  type: 'fields';
  title?: string;
  description?: string;
  fields?: string[];
}

export type PopupElementType = 'text' | 'fields';

export interface PopupElement
  extends Omit<PopupElementText, 'type'>,
    Omit<PopupElementFields, 'type'> {
  type: PopupElementType;
}

export type LayerSymbol = {
  color: string;
  size: number;
  style: string;
};
export interface DrawingInfo {
  renderer?: {
    type?: string;
    symbol?: LayerSymbol;
    blur?: number;
    radius?: number;
    gradient?: string;
  };
}
export interface FeatureReduction {
  type: 'cluster';
  drawingInfo?: DrawingInfo;
  clusterRadius?: number;
}
export interface LayerDefinition {
  minZoom?: number;
  maxZoom?: number;
  featureReduction?: FeatureReduction;
  // Symbol
  drawingInfo?: DrawingInfo;
}

/** Layer documents interface declaration */
export interface Layer extends Document {
  kind: 'Layer';
  name: string;
  sublayers?: any[];
  createdAt: Date;
  modifiedAt: Date;
  visibility: boolean;
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
