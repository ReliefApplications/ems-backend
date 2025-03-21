/* eslint-disable @typescript-eslint/naming-convention */
import { AccessibleRecordModel } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { CompositeFilterDescriptor } from 'types';

/**
 * Interface representing either a filter definition used to fetch emails, a static list of emails, or both
 */
export interface DistributionListSource {
  reference?: string;
  resource?: string;
  commonServiceFilter?: CompositeFilterDescriptor;
  query?: {
    name: string;
    filter: any;
    fields: any[];
  };
  inputEmails?: string[];
}

/** distribution list documents interface declaration */
export interface EmailDistributionList extends Document {
  kind: 'EmailDistributionList';
  name: string;
  to: DistributionListSource;
  cc: DistributionListSource;
  bcc: DistributionListSource;
  createdBy: { name: string; email: string };
  isDeleted: number;
  applicationId?: mongoose.Schema.Types.ObjectId;
}

/** Mongoose distribution list schema declaration */
export const emailDistributionListSchema = new Schema<EmailDistributionList>(
  {
    name: String,
    to: {
      resource: String,
      reference: String,
      commonServiceFilter: { type: mongoose.Schema.Types.Mixed },
      query: {
        name: String,
        filter: { type: mongoose.Schema.Types.Mixed },
        fields: [{ type: mongoose.Schema.Types.Mixed }],
      },
      inputEmails: { type: [String] },
    },
    cc: {
      resource: String,
      reference: String,
      commonServiceFilter: { type: mongoose.Schema.Types.Mixed },
      query: {
        name: String,
        filter: { type: mongoose.Schema.Types.Mixed },
        fields: [{ type: mongoose.Schema.Types.Mixed }],
      },
      inputEmails: { type: [String] },
    },
    bcc: {
      resource: String,
      reference: String,
      commonServiceFilter: { type: mongoose.Schema.Types.Mixed },
      query: {
        name: String,
        filter: { type: mongoose.Schema.Types.Mixed },
        fields: [{ type: mongoose.Schema.Types.Mixed }],
      },
      inputEmails: { type: [String] },
    },
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
  { name: 1, applicationId: 1 },
  { unique: true }
);

/** Mongoose distribution list model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailDistributionList = mongoose.model<
  EmailDistributionList,
  AccessibleRecordModel<EmailDistributionList>
>('EmailDistributionList', emailDistributionListSchema);
