import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { status } from '../const/enumTypes';

const formSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    core: Boolean,
    status: {
        type: String,
        enum: Object.values(status)
    },
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
        }],
        canCreateRecords: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
        }],
        canSeeRecords: [
            {
                role: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                },
                access: mongoose.Schema.Types.Mixed
            }
        ],
        canUpdateRecords: [
            {
                role: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                },
                access: mongoose.Schema.Types.Mixed
            }
        ],
        canDeleteRecords: [
            {
                role: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Role'
                },
                access: mongoose.Schema.Types.Mixed
            }
        ],
        recordsUnicity: {
            condition: String,
            rules: [mongoose.Schema.Types.Mixed]
        }
    },
    fields: {
        // name of field, id if external resource
        type: [mongoose.Schema.Types.Mixed]
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    versions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Version'
    },
    channel: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Channel'
    },
    koboUrl: String,
    uid: String
});

export interface Form extends Document {
    kind: 'Form';
    name?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    structure?: any;
    core?: boolean;
    status?: string;
    permissions?: {
        canSee?: any[],
        canCreate?: any[],
        canUpdate?: any[],
        canDelete?: any[],
        canCreateRecords?: any[],
        canSeeRecords?: any[],
        canUpdateRecords?: any[],
        canDeleteRecords?: any[],
        recordsUnicity?: any,
    },
    fields?: any[];
    resource?: any;
    versions?: any[];
    channel?: any;
    koboUrl?: string;
    uid?: string;
}

formSchema.index({ resource: 1 }, { unique: true, partialFilterExpression: { core: true} });
formSchema.plugin(accessibleRecordsPlugin);
export const Form = mongoose.model<Form, AccessibleRecordModel<Form>>('Form', formSchema);
