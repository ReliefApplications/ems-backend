import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDelete } from '../utils/models/deletion';
import { Step } from './step';

/** Workflow  documents interface declaration */
export interface Workflow extends Document {
  kind: 'Workflow';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  steps: any[];
}

/** Mongoose workflow schema declaration */
const workflowSchema = new Schema<Workflow>({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  steps: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Step',
  },
});

// add a function to delete dependant objects on workflow deletion
addOnBeforeDelete(workflowSchema, async (workflow) => {
  console.log(`Deleting dependencies of workflow ${workflow._id}...`);
  for (const step of workflow.steps) {
    await Step.findByIdAndDelete(step);
  }
});

workflowSchema.plugin(accessibleRecordsPlugin);

/** Mongoose workflow model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Workflow = mongoose.model<
  Workflow,
  AccessibleRecordModel<Workflow>
>('Workflow', workflowSchema);
