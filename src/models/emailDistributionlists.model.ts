import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose distribution list schema declaration */
export const emailDistributionListSchema = new Schema(
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** distribution list documents interface declaration */
// export interface DistributionList extends Document {
//   kind: 'DistributionList';
//   name?: string;
//   emails?: string[];
//   createdAt?: Date;
//   modifiedAt?: Date;
// }

interface EmailDistributionList extends Document {
  kind: 'EmailDistributionList';
  distributionListName: string;
  To: string[];
  Cc: string[];
  Bcc: string[];
  createdBy: { name: string; email: string };
  isDeleted: number;
}

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailDistributionList = mongoose.model<
  EmailDistributionList,
  AccessibleRecordModel<EmailDistributionList>
>('EmailDistributionList', emailDistributionListSchema);
