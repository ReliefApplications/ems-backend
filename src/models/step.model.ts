import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { contentType, statusType } from '@const/enumTypes';
import { Dashboard } from './dashboard.model';
import { Workflow } from './workflow.model';

/** Step documents interface definition */
export interface Step extends Document {
  kind: 'Step';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  status?: any;
  content: any;
  permissions: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
  canSee?: any;
  canUpdate?: any;
  canDelete?: any;
}

/** Mongoose step schema definition */
const stepSchema = new Schema<Step>(
  {
    name: String,
    type: {
      type: String,
      enum: Object.values(contentType),
    },
    status: {
      type: String,
      enum: Object.values(statusType),
    },
    // Can be either a dashboard or a form ID
    content: mongoose.Schema.Types.ObjectId,
    permissions: {
      canSee: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
      ],
      canUpdate: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
      ],
      canDelete: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
      ],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// handle cascading deletion for steps
addOnBeforeDeleteMany(stepSchema, async (steps) => {
  // CASCADE DELETION
  const dashboards = steps
    .filter((step) => step.content && step.type === contentType.dashboard)
    .map((step) => step.content);
  // if (dashboards) await Dashboard.deleteMany({ _id: { $in: dashboards } });
  if (!!dashboards) {
    const dashboardData = await Dashboard.find({ _id: { $in: dashboards } });
    dashboardData.map(async function (items) {
      if (!!items.status && items.status === statusType.archived) {
        await Dashboard.deleteOne(items._id);
        // REFERENCES DELETION
        await Workflow.updateMany(
          { steps: { $in: steps } },
          //{ modifiedAt: new Date(), $pull: { steps: { $in: steps } } }
          { $pull: { steps: { $in: steps } } }
        );
      } else {
        await Dashboard.findByIdAndUpdate(
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

stepSchema.plugin(accessibleRecordsPlugin);

/** Mongoose step model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Step = mongoose.model<Step, AccessibleRecordModel<Step>>(
  'Step',
  stepSchema
);
