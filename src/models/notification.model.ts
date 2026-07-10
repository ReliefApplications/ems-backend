import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose notification schema declaration */
const notificationSchema = new Schema(
  {
    action: String,
    content: mongoose.Schema.Types.Mixed,
    // Channel-based notifications target every user subscribed to the channel.
    // Either `channel` or `user` is set depending on how the notification was
    // generated (channel broadcast vs. per-user delivery, e.g. email events).
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    // User-targeted notifications are delivered to a single user (e.g. email
    // events relayed from the email function).
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    seenBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// notificationSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 3600 * 24 * 30 }
// ); // After 60 days, the notification is erased

/** Notification documents interface declaration */
export interface Notification extends Document {
  kind: 'Notification';
  action: string;
  content: any;
  createdAt: Date;
  channel: any;
  user: any;
  seenBy: any[];
}

notificationSchema.plugin(accessibleRecordsPlugin);

/** Mongoose notification model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Notification = mongoose.model<
  Notification,
  AccessibleRecordModel<Notification>
>('Notification', notificationSchema);
