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
    attributeAccess: any;
}

recordSchema.plugin(accessibleRecordsPlugin);
export const Record = mongoose.model<Record, AccessibleRecordModel<Record>>('Record', recordSchema);