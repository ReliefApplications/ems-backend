import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { status } from '../const/enumTypes';
import { ApiConfiguration } from './apiConfiguration';
import { Channel } from './channel';
import { Form } from './form';

const pullJobSchema = new Schema({
    name: String,
    status: {
        type: String,
        enum: Object.values(status)
    },
    apiConfiguration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiConfiguration'
    },
    schedule: String,
    convertTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form'
    },
    mapping: mongoose.Schema.Types.Mixed,
    uniqueIdentifiers: [String],
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel'
    }
});

pullJobSchema.index({name: 1}, {unique: true});

export interface PullJob extends Document {
    kind: 'PullJob';
    name: string;
    status: string;
    apiConfiguration: ApiConfiguration;
    schedule: string;
    convertTo: Form;
    mapping: any;
    uniqueIdentifiers: string[];
    channel: Channel;
}
pullJobSchema.plugin(accessibleRecordsPlugin);
export const PullJob = mongoose.model<PullJob, AccessibleRecordModel<PullJob>>('PullJob', pullJobSchema);
