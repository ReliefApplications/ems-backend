import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const formSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    structure: mongoose.Schema.Types.Mixed,
    core: Boolean,
    status: {
        type: String,
        enum: ['active', 'pending', 'archived']
    },
    permissions: {
        canSee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role'
            // role: {
            //     type: mongoose.Schema.Types.ObjectId,
            //     ref: 'Role'
            // },
            // attributes: {
            //     type: [mongoose.Schema.Types.ObjectId],
            //     ref: 'PositionAttribute'
            // }
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
        canCreateRecords: [
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
    }
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
        // {
        //     role: any,
        //     attributes: any
        // }[]
        canCreate?: any[],
        canUpdate?: any[],
        canDelete?: any[],
        canSeeRecords?: any,
        canUpdateRecords?: any,
        canCreateRecords?: any,
        canDeleteRecords?: any
    },
    fields?: any[];
    resource?: any;
    versions?: any[]
}

formSchema.index({ resource: 1 }, { unique: true, partialFilterExpression: { core: true} });
formSchema.plugin(accessibleRecordsPlugin);
export const Form = mongoose.model<Form, AccessibleRecordModel<Form>>('Form', formSchema);