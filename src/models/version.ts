import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const versionSchema = new Schema({
  createdAt: Date,
  data: mongoose.Schema.Types.Mixed,
  createdBy: mongoose.Schema.Types.ObjectId,
});

export interface Version extends Document {
  kind: 'Version';
  createdAt?: Date;
  data?: any;
  createdBy?: any;
}

versionSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Version = mongoose.model<Version, AccessibleRecordModel<Version>>(
  'Version',
  versionSchema
);
