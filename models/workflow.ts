import mongoose, { Schema, Document } from 'mongoose';

const workflowSchema = new Schema({
    name: String,
    createdAt: Date,
    modifiedAt: Date,
    steps: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Step'
    }
});

export interface Workflow extends Document {
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    steps: any[];
}

export default mongoose.model<Workflow>('Workflow', workflowSchema);