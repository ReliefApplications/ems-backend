import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const channelSchema = new Schema({
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

channelSchema.index({ title: 1, application: 1, form: 1 }, { unique: true });

export interface Channel extends Document {
  title?: string;
  application?: any;
  form?: any;
}

channelSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Channel = mongoose.model<Channel, AccessibleRecordModel<Channel>>('Channel', channelSchema);
