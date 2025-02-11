import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose template schema declaration */
export const templateSchema = new Schema(
  {
    name: String,
    type: String,
    content: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** template documents interface declaration */
export interface Template extends Document {
  kind: 'Template';
  type?: 'email' | 'notification'; // In the case we add other types of templates in the future
  name?: string;
  content?: any;
  createdAt?: Date;
  modifiedAt?: Date;
}
