import mongoose, { Schema } from 'mongoose';

/** Mongoose aggregation schema declaration */
export const aggregationSchema = new Schema(
  {
    dataSource: String,
    sourceFields: mongoose.Schema.Types.Mixed,
    pipeline: mongoose.Schema.Types.Mixed,
    mapping: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);
