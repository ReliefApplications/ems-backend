import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const channelSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    application: {
        type: mongoose.Types.ObjectId,
        ref: 'Application'
    }
});

channelSchema.index({title: 1, application: 1}, {unique: true});

export interface Channel extends Document {
    title?: string;
    application?: any;
}

channelSchema.plugin(accessibleRecordsPlugin);
export const Channel = mongoose.model<Channel, AccessibleRecordModel<Channel>>('Channel', channelSchema);