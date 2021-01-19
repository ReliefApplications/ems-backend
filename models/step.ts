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
    settings: mongoose.Schema.Types.Mixed
});

export interface Step extends Document {
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    type: string;
    content: any;
    permissions: any;
    settings: any;
}

export const Step = mongoose.model<Step>('Step', stepSchema);