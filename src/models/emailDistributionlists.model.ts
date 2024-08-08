/* eslint-disable @typescript-eslint/naming-convention */
import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** distribution list documents interface declaration */
export interface EmailDistributionList extends Document {
  kind: 'EmailDistributionList';
  distributionListName: string;
  To: string[];
  Cc: string[];
  Bcc: string[];
  createdBy: { name: string; email: string };
  isDeleted: number;
  applicationId?: mongoose.Schema.Types.ObjectId;
}

/** Mongoose distribution list schema declaration */
export const emailDistributionListSchema = new Schema<EmailDistributionList>(
  {
    distributionListName: String,
    To: [{ type: String }],
    Cc: [{ type: String }],
    Bcc: [{ type: String }],
    createdBy: {
      name: String,
      email: String,
    },
    isDeleted: {
      type: Number,
      default: 0,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

emailDistributionListSchema.index(
  { distributionListName: 1, applicationId: 1 },
  { unique: true }
);

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailDistributionList = mongoose.model<
  EmailDistributionList,
  AccessibleRecordModel<EmailDistributionList>
>('EmailDistributionList', emailDistributionListSchema);
