import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDelete } from '../utils/models/deletion';
import { contentType } from '../const/enumTypes';
import { Dashboard } from './dashboard';

/** Step documents interface definition */
export interface Step extends Document {
  kind: 'Step';
  name: string;
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
}

/** Mongoose step schema definition */
const stepSchema = new Schema<Step>({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
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
});

// add a function to delete dependant objects on step deletion
addOnBeforeDelete(stepSchema, async (step) => {
  console.log(`Deleting step ${step._id}...`);
  if (step.content) {
    switch (step.type) {
      case contentType.dashboard: {
        await Dashboard.findByIdAndDelete(step.content);
        break;
      }
      default:
        break;
    }
  }
});

stepSchema.plugin(accessibleRecordsPlugin);

/** Mongoose step model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Step = mongoose.model<Step, AccessibleRecordModel<Step>>(
  'Step',
  stepSchema
);
