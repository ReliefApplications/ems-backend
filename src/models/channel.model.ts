import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Notification } from './notification.model';

/** Channel documents interface declaration */
export interface Channel extends Document {
  kind: 'Channel';
  title?: string;
  application?: any;
  form?: any;
}

/** Mongoose channel schema declaration */
const channelSchema = new Schema<Channel>({
  title: {
    type: String,
    required: true,
  },
  application: {
    type: mongoose.Types.ObjectId,
    ref: 'Application',
  },
  form: {
    type: mongoose.Types.ObjectId,
    ref: 'Form',
  },
});

// handle cascading deletion for channels
addOnBeforeDeleteMany(channelSchema, async (channels) => {
  // Delete linked notifications
  await Notification.deleteMany({ channel: { $in: channels } });
});

channelSchema.index({ title: 1, application: 1, form: 1 }, { unique: true });
channelSchema.plugin(accessibleRecordsPlugin);

/** Mongoose channel model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Channel = mongoose.model<Channel, AccessibleRecordModel<Channel>>(
  'Channel',
  channelSchema
);
