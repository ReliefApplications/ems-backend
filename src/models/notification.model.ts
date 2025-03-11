import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose notification schema declaration */
const notificationSchema = new Schema(
  {
    action: String,
    content: mongoose.Schema.Types.Mixed,
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
    seenBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    redirect: mongoose.Schema.Types.Mixed,
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
  seenBy: any[];
  user?: any;
  redirect?: any;
  // redirect?: {
  //   active: boolean;
  //   type: string; // 'url' | 'recordIds'
  //   url?: string;
  //   recordIds?: string[];
  //   layout?: string;
  //   resource?: string;
  // };
}

notificationSchema.pre('validate', function (next) {
  if (!this.channel && !this.user) {
    return next(
      new Error('At least only field (channels, user) should be populated')
    );
  }
  next();
});

notificationSchema.plugin(accessibleRecordsPlugin);

/** Mongoose notification model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Notification = mongoose.model<
  Notification,
  AccessibleRecordModel<Notification>
>('Notification', notificationSchema);
