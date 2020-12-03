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
    }
});

export interface Page extends Document {
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    type: string;
    content: any;
    permissions: any;
}

export default mongoose.model<Page>('Page', pageSchema);