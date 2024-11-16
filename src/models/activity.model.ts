import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

export interface Activity extends Document {
  kind: 'Activity';
  userId: string;
  eventType: string;
  metadata: any;
}

// export interface ActivityLogModel extends AccessibleRecordModel<ActivityLog> {}

const schema = new Schema<Activity>(
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
export const Activity = mongoose.model<
  Activity,
  AccessibleRecordModel<Activity>
>('ActivityLog', schema);
