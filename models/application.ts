import mongoose, { Schema, Document } from 'mongoose';
import { Page } from './page';
import { RoleGroup } from './roleGroup';

const applicationSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    status: {
        type: String,
        enum: ['active', 'pending', 'archived']
    },
    createdBy: {
        type: [mongoose.Schema.Types.ObjectId],
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
        canCreate: [{
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
    roleGroups: {
        // id of role groups linked to this application
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'RoleGroup'
    }
});

applicationSchema.index({name: 1}, {unique: true});

export interface Application extends Document {
    name?: string;
    createdAt: Date;
    modifiedAt: Date;
    status?: any;
    createdBy?: any;
    pages?: Page[];
    settings?: any;
    permissions?: any;
    subscriptions?: [{
        routingKey?: string,
        title: string,
        convertTo?: string;
        channel?: string;
    }],
    roleGroups: RoleGroup[]
}

export const Application = mongoose.model<Application>('Application', applicationSchema);
