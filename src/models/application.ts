import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { status } from '../const/enumTypes';

const applicationSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: Object.values(status)
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    pages: {
        // id of pages linked to this application
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Page'
    },
    settings: mongoose.Schema.Types.Mixed,
    description: String,
    permissions: {
        canSee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canUpdate: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canDelete: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }]
    },
    subscriptions: [{
        routingKey: String,
        title: String,
        convertTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Form'
        },
        channel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Channel'
        }
    }],
    pullJobs: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'PullJob'
    }
});

applicationSchema.index({name: 1}, {unique: true});

export interface Application extends Document {
    kind: 'Application';
    name?: string;
    createdAt: Date;
    modifiedAt: Date;
    status?: any;
    createdBy?: string;
    pages?: any[];
    settings?: any;
    lockedBy?: string;
    permissions?: {
        canSee?: any[],
        canUpdate?: any[],
        canDelete?: any[]
    },
    subscriptions?: {
        routingKey?: string,
        title: string,
        convertTo?: string;
        channel?: string;
    }[];
    pullJobs?: string[];
}
applicationSchema.plugin(accessibleRecordsPlugin);
export const Application = mongoose.model<Application, AccessibleRecordModel<Application>>('Application', applicationSchema);
