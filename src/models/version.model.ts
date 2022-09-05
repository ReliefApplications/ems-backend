import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose version schema declaration */
const versionSchema = new Schema(
  {
    data: mongoose.Schema.Types.Mixed,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: { createdAt: 'createdAt' },
  }
);

/** Version documents interface declaration */
export interface Version extends Document {
  kind: 'Version';
  createdAt?: Date;
  data?: any;
  createdBy?: any;
}

versionSchema.plugin(accessibleRecordsPlugin);

/** Mongoose version model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Version = mongoose.model<Version, AccessibleRecordModel<Version>>(
  'Version',
  versionSchema
);
