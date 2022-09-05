import mongoose, { Schema } from 'mongoose';

/** Mongoose dashboard widget schema declaration */
export const dashboardWidgetSchema = new Schema(
  {
    name: String,
    type: String,
    defaultCols: Number,
    defaultRows: Number,
    settings: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);
