import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose layout schema declaration */
export const layoutSchema = new Schema(
  {
    name: String,
    query: {
      type: mongoose.Schema.Types.Mixed,
    },
    display: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** Layout documents interface declaration */
export interface Layout extends Document {
  kind: 'Layout';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  query?: any;
  display?: any;
}
