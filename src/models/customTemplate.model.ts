import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/**
 *
 */
export interface CustomTemplate extends Document {
  kind: 'customTemplate';
  name: string;
  subject: string;
  header?: any;
  body?: any;
  banner?: any;
  footer?: any;
  createdBy: { name: string; email: string };
  isDeleted: number;
  applicationId?: mongoose.Schema.Types.ObjectId;
  isFromEmailNotification: boolean;
}

/** Mongoose distribution list schema declaration */
export const customTemplateSchema = new Schema<CustomTemplate>(
  {
    name: String,
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
    createdBy: {
      name: String,
      email: String,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isFromEmailNotification: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

customTemplateSchema.index({ name: 1, applicationId: 1 }, { unique: true });

/** Mongoose custom template model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CustomTemplate = mongoose.model<
  CustomTemplate,
  AccessibleRecordModel<CustomTemplate>
>('customTemplate', customTemplateSchema);
