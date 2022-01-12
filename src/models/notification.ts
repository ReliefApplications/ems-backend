import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const notificationSchema = new Schema({
  action: String,
  content: mongoose.Schema.Types.Mixed,
  createdAt: Date,
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
  },
  seenBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
  },
});

export interface Notification extends Document {
  kind: 'Notification';
  action: string;
  content: any;
  createdAt: Date;
  channel: any;
  seenBy: any[];
}

notificationSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Notification = mongoose.model<
  Notification,
  AccessibleRecordModel<Notification>
>('Notification', notificationSchema);
