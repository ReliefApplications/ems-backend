import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/enumTypes';
import { addOnBeforeDeleteMany } from '../utils/models/deletion';
import { Application } from './application';
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

// handle cascading deletion and references deletion for pages
addOnBeforeDeleteMany(pageSchema, async (pages) => {
  // CASCADE DELETION
  // Delete the dependants workflows
  const workflows = pages
    .filter((page) => page.content && page.type === contentType.workflow)
    .map((page) => page.content);
  if (workflows) await Workflow.deleteMany({ _id: { $in: workflows } });
  // Delete the dependants dashboards
  const dashboards = pages
    .filter((page) => page.content && page.type === contentType.dashboard)
    .map((page) => page.content);
  if (dashboards) await Dashboard.deleteMany({ _id: { $in: dashboards } });

  // REFERENCES DELETION
  // Delete references to the pages in applications containing these pages
  await Application.updateMany(
    { pages: { $in: pages } },
    { modifiedAt: new Date(), $pull: { pages: { $in: pages } } }
  );
});

pageSchema.plugin(accessibleRecordsPlugin);

/** Mongoose page model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>(
  'Page',
  pageSchema
);
