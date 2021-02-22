import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const recordSchema = new Schema({
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        required: false
    },
    createdAt: Date,
    modifiedAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId,
    deleted: {
        type: Boolean,
        default: false
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    versions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Version'
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
        }]
    }
});

export interface Record extends Document {
    kind: 'Record';
    form: any;
    resource: any;
    createdAt: Date;
    modifiedAt: Date;
    deleted: boolean;
    data: any;
    versions: any;
    permissions: {
        canSee?: any[],
        // {
        //     role: any,
        //     attributes: any
        // }[]
        canCreate?: any[],
        canUpdate?: any[],
        canDelete?: any[]
    },
    createdBy?: any;
}

recordSchema.plugin(accessibleRecordsPlugin);
export const Record = mongoose.model<Record, AccessibleRecordModel<Record>>('Record', recordSchema);