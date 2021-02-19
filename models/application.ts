import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

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
            role: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            attributes: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'PositionAttribute'
            }
        }],
        canCreate: [{
            role: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            attributes: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'PositionAttribute'
            }
        }],
        canUpdate: [{
            role: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            attributes: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'PositionAttribute'
            }
        }],
        canDelete: [{
            role: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role'
            },
            attributes: {
                type: [mongoose.Schema.Types.ObjectId],
                ref: 'PositionAttribute'
            }
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
    positionAttributeCategories: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'PositionAttributeCategory'
    }
});

applicationSchema.index({name: 1}, {unique: true});

export interface Application extends Document {
    kind: 'Application';
    name?: string;
    createdAt: Date;
    modifiedAt: Date;
    status?: any;
    createdBy?: any;
    pages?: any[];
    settings?: any;
    permissions: {
        canSee: {
            role: any,
            attributes: any
        }[],
        canCreate: {
            role: any,
            attributes: any
        }[],
        canUpdate: {
            role: any,
            attributes: any
        }[],
        canDelete: {
            role: any,
            attributes: any
        }[]
    },
    subscriptions?: {
        routingKey?: string,
        title: string,
        convertTo?: string;
        channel?: string;
    }[];
    positionAttributeCategories: any;
}
applicationSchema.plugin(accessibleRecordsPlugin);
export const Application = mongoose.model<Application, AccessibleRecordModel<Application>>('Application', applicationSchema);
