import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose distribution list schema declaration */
export const customTemplateSchema = new Schema(
  {
    subject: String,
    header: {
      type: mongoose.Schema.Types.Mixed,
    },
    body: { type: mongoose.Schema.Types.Mixed },
    banner: { type: mongoose.Schema.Types.Mixed },
    footer: {
      type: mongoose.Schema.Types.Mixed,
    },
    isDeleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

interface CustomTemplate extends Document {
  kind: 'customTemplate';
  subject: string;
  header?: any;
  body?: any;
  banner?: any;
  footer?: any;
  isDeleted: number;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CustomTemplate = mongoose.model<
  CustomTemplate,
  AccessibleRecordModel<CustomTemplate>
>('customTemplate', customTemplateSchema);