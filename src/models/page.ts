import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/enumTypes';
import { addOnBeforeDelete } from '../utils/models/deletion';
import { Dashboard } from './dashboard';
import { Workflow } from './workflow';

/** Page documents interface declaration */
export interface Page extends Document {
  kind: 'Page';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  content: any;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
}

/** Mongoose page schema declaration */
const pageSchema = new Schema<Page>({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  type: {
    type: String,
    enum: Object.values(contentType),
  },
  // Can be either a workflow, a dashboard or a form ID
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

// add a function to delete dependant objects on page deletion
addOnBeforeDelete(pageSchema, async (page) => {
  console.log(`Deleting dependencies of page ${page.id}...`);
  if (page.content) {
    switch (page.type) {
      case contentType.workflow: {
        await Workflow.findByIdAndDelete(page.content);
        break;
      }
      case contentType.dashboard:
        await Dashboard.findByIdAndDelete(page.content);
        break;
      default:
        break;
    }
  }
});

pageSchema.plugin(accessibleRecordsPlugin);

/** Mongoose page model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>(
  'Page',
  pageSchema
);
