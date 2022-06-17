import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDelete } from '../utils/models/deletion';
import { Notification } from './notification';

/** Channel documents interface declaration */
export interface Channel extends Document {
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

// add a function to delete dependant objects on channel deletion
addOnBeforeDelete(channelSchema, async (channel) => {
  console.log(`Deleting dependencies of channel ${channel.id}...`);
  // Delete linked notifications
  await Notification.deleteMany({ channel: channel.id });
});

channelSchema.index({ title: 1, application: 1, form: 1 }, { unique: true });
channelSchema.plugin(accessibleRecordsPlugin);

/** Mongoose channel model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Channel = mongoose.model<Channel, AccessibleRecordModel<Channel>>(
  'Channel',
  channelSchema
);
