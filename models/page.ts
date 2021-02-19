import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/contentType';

const pageSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    type: {
        type: String,
        enum: [contentType.workflow, contentType.dashboard, contentType.form]
    },
    // Can be either a workflow, a dashboard or a form ID
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
    },
});

export interface Page extends Document {
    kind: 'Page';
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
    }
}

pageSchema.plugin(accessibleRecordsPlugin);
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>('Page', pageSchema);