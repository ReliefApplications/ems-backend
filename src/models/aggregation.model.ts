import mongoose, { Schema } from 'mongoose';

/** Mongoose aggregation schema declaration */
export const aggregationSchema = new Schema(
  {
    name: String,
    sourceFields: mongoose.Schema.Types.Mixed,
    pipeline: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** Aggregation documents interface declaration */
export interface Aggregation extends Document {
  kind: 'Aggregation';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  sourceFields?: any;
  pipeline?: any;
}
