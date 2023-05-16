import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Step } from './step.model';
import { statusType } from '@const/enumTypes';

/** Workflow  documents interface declaration */
export interface Workflow extends Document {
  kind: 'Workflow';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  steps: any[];
  status?: any;
}

/** Mongoose workflow schema declaration */
const workflowSchema = new Schema<Workflow>(
  {
    name: String,
    steps: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Step',
    },
    status: {
      type: String,
      enum: Object.values(statusType),
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// handle cascading deletion for workflows
addOnBeforeDeleteMany(workflowSchema, async (workflows) => {
  const steps = workflows.reduce((acc, w) => acc.concat(w.steps), []);
  // await Step.deleteMany({ _id: { $in: steps } });
  if (!!steps) {
    const stepData = await Step.find({ _id: { $in: steps } });
    stepData.map(async function (items) {
      if (!!items.status && items.status === statusType.archived) {
        await Step.deleteOne(items._id);
      } else {
        await Step.findByIdAndUpdate(
          items._id,
          {
            $set: {
              status: statusType.archived,
            },
          },
          { new: true }
        );
      }
    });
  }
});

workflowSchema.plugin(accessibleRecordsPlugin);

/** Mongoose workflow model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Workflow = mongoose.model<
  Workflow,
  AccessibleRecordModel<Workflow>
>('Workflow', workflowSchema);
