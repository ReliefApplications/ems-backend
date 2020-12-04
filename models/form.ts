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

export interface IForm extends Document {
    name?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    structure?: any;
    core?: boolean;
    status?: string;
    permissions?: any;
    fields?: any[];
    resource?: any;
    versions?: any[]
}

formSchema.index({ resource: 1 }, { unique: true, partialFilterExpression: { core: true} });

export const Form = mongoose.model<IForm>('Form', formSchema);