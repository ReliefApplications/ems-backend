import { AccessibleRecordModel } from '@casl/mongoose';
import { layerType } from '@const/enumTypes';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteOne } from '@utils/models/deletion';

/** Layer documents interface declaration */
export interface Layer extends Document {
  kind: 'Layer';
  name: string;
  sublayers?: any[];
  createdAt: Date;
  modifiedAt: Date;
  visibility: boolean;
  layerType: string;
  layerDefinition: any;
  popupInfo: any;
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
    layerType: {
      type: String,
      enum: Object.values(layerType),
    },
    layerDefinition: {
      featureReduction: mongoose.Schema.Types.Mixed,
      drawingInfo: mongoose.Schema.Types.Mixed,
    },
    popupInfo: {
      popupElements: mongoose.Schema.Types.Mixed,
      description: String,
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