import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/contentType';

const stepSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    type: {
        type: String,
        enum: [contentType.dashboard, contentType.form]
    },
    // Can be either a dashboard or a form ID
    content: mongoose.Schema.Types.ObjectId,
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
    }
});

export interface Step extends Document {
    kind: 'Step';
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    type: string;
    content: any;
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
    canSee?: any;
    canCreate?: any;
    canUpdate?: any;
    canDelete?: any;
}

stepSchema.plugin(accessibleRecordsPlugin);
export const Step = mongoose.model<Step, AccessibleRecordModel<Step>>('Step', stepSchema);