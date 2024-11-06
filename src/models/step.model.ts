import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import { contentType } from '@const/enumTypes';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import mongoose, { Document, Schema } from 'mongoose';
import { Dashboard } from './dashboard.model';
import { Button, buttonSchema } from './quickActions.model';
import { Workflow } from './workflow.model';

/** Step documents interface definition */
export interface Step extends Document {
  kind: 'Step';
  name: string;
  icon: string;
  showName?: boolean;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  content: any;
  permissions: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
  canSee?: any;
  canUpdate?: any;
  canDelete?: any;
  archived: boolean;
  archivedAt?: Date;
  buttons?: Button[];
}

/** Mongoose step schema definition */
const stepSchema = new Schema<Step>(
  {
    name: String,
    icon: String,
    showName: Boolean,
    type: {
      type: String,
      enum: Object.values(contentType),
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
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      expires: 2592000,
    },
    buttons: [buttonSchema],
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
  if (dashboards) await Dashboard.deleteMany({ _id: { $in: dashboards } });

  // REFERENCES DELETION
  await Workflow.updateMany(
    { steps: { $in: steps } },
    //{ modifiedAt: new Date(), $pull: { steps: { $in: steps } } }
    { $pull: { steps: { $in: steps } } }
  );
});

stepSchema.plugin(accessibleRecordsPlugin);

/** Mongoose step model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Step = mongoose.model<Step, AccessibleRecordModel<Step>>(
  'Step',
  stepSchema
);
