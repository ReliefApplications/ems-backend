import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

export interface ActivityLog extends Document {
  kind: 'ActivityLog';
  userId: string;
  eventType: string;
  metadata: any;
}

// export interface ActivityLogModel extends AccessibleRecordModel<ActivityLog> {}

const schema = new Schema<ActivityLog>(
  {
    userId: String,
    eventType: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt' },
  }
);

schema.plugin(accessibleRecordsPlugin);

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ActivityLog = mongoose.model<
  ActivityLog,
  AccessibleRecordModel<ActivityLog>
>('ActivityLog', schema);
