import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Step } from './step.model';
import { has } from 'lodash';

/** Workflow  documents interface declaration */
export interface Workflow extends Document {
  kind: 'Workflow';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  steps: any[];
  archived: boolean;
  archivedAt?: Date;
}

/** Mongoose workflow schema declaration */
const workflowSchema = new Schema<Workflow>(
  {
    name: String,
    steps: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Step',
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      expires: 2592000,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

workflowSchema.pre('updateOne', async function () {
  const update = this.getUpdate();
  if (has(update, 'archived')) {
    // Copy query to get workflow
    const workflow: Workflow = await this.clone().findOne();
    // eslint-disable-next-line @typescript-eslint/dot-notation
    if (update['archived']) {
      // Automatically archive related steps
      await Step.updateMany(
        {
          _id: { $in: workflow.steps },
        },
        {
          $set: {
            archived: true,
            // eslint-disable-next-line @typescript-eslint/dot-notation
            archivedAt: update['archivedAt'],
          },
        }
      );
    } else {
      // Automatically unarchive related steps
      await Step.updateMany(
        {
          _id: { $in: workflow.steps },
        },
        {
          $set: {
            archived: false,
            archivedAt: null,
          },
        }
      );
    }
  }
});

// handle cascading deletion for workflows
addOnBeforeDeleteMany(workflowSchema, async (workflows) => {
  const steps = workflows.reduce((acc, w) => acc.concat(w.steps), []);
  await Step.deleteMany({ _id: { $in: steps } });
});

workflowSchema.plugin(accessibleRecordsPlugin);

/** Mongoose workflow model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Workflow = mongoose.model<
  Workflow,
  AccessibleRecordModel<Workflow>
>('Workflow', workflowSchema);
