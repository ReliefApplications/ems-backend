import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const resourceSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: Date,
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
    fields: {
        // name of field, id if external resource
        type: [mongoose.Schema.Types.Mixed]
    }
});

export interface Resource extends Document {
    kind: 'Resource';
    name: string;
    createdAt: Date;
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
    fields: any[];
}

resourceSchema.plugin(accessibleRecordsPlugin);
export const Resource = mongoose.model<Resource, AccessibleRecordModel<Resource>>('Resource', resourceSchema);