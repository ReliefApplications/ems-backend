import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Layer documents interface declaration */
export interface Layer extends Document {
  kind: 'Layer';
  name: string;
  sublayers?: any[];
  createdAt: Date;
  modifiedAt: Date;
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** Mongoose layer model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Layer = mongoose.model<Layer, AccessibleRecordModel<Layer>>(
  'Layer',
  layerSchema
);
