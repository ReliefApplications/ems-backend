import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose workflow schema declaration */
const workflowSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  steps: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Step',
  },
});

/** Workflow  documents interface declaration */
export interface Workflow extends Document {
  kind: 'Workflow';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  steps: any[];
}

workflowSchema.plugin(accessibleRecordsPlugin);

/** Mongoose workflow model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Workflow = mongoose.model<
  Workflow,
  AccessibleRecordModel<Workflow>
>('Workflow', workflowSchema);
