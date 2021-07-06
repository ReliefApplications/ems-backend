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
    createdBy: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        roles: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Role'
        },
        positionAttributes: [{
            value: String,
            category: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'PositionAttributeCategory'
            }
        }]
    },
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
