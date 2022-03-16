import mongoose, { Schema, Document } from 'mongoose';

export const layoutSchema = new Schema({
  name: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  modifiedAt: {
    type: Date,
    default: Date.now,
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
  },
  display: {
    type: mongoose.Schema.Types.Mixed,
  },
});

export interface Layout extends Document {
  kind: 'Layout';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  query?: any;
  display?: any;
}
