import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const workflowSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  steps: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Step',
  },
});

export interface Workflow extends Document {
  kind: 'Workflow';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  steps: any[];
}

workflowSchema.plugin(accessibleRecordsPlugin);
export const Workflow = mongoose.model<Workflow, AccessibleRecordModel<Workflow>>('Workflow', workflowSchema);
