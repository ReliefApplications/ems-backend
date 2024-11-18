import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose activity log schema declaration */
export interface ActivityLog extends Document {
  kind: 'ActivityLog';
  userId: mongoose.Types.ObjectId;
  eventType: string;
  metadata: any;
}

/** Activity log documents interface declaration */
const schema = new Schema<ActivityLog>(
  {
    userId: Schema.Types.ObjectId,
    eventType: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt' },
  }
);

schema.plugin(accessibleRecordsPlugin);

/** Mongoose activity log model */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ActivityLog = mongoose.model<
  ActivityLog,
  AccessibleRecordModel<ActivityLog>
>('ActivityLog', schema);
