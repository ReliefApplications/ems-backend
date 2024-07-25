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
    createdBy: {
      name: String,
      email: String,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/**
 *
 */
interface ICustomTemplate extends Document {
  kind: 'customTemplate';
  subject: string;
  header?: any;
  body?: any;
  banner?: any;
  footer?: any;
  isDeleted: number;
  applicationId?: mongoose.Schema.Types.ObjectId;
}

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const CustomTemplate = mongoose.model<
  ICustomTemplate,
  AccessibleRecordModel<ICustomTemplate>
>('customTemplate', customTemplateSchema);
