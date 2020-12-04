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
    fields: {
        // name of field, id if external resource
        type: [mongoose.Schema.Types.Mixed]
    }
});

export interface IResource extends Document {
    name: string;
    createdAt: Date;
    permissions: any;
    fields: any[];
}

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);