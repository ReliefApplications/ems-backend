import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType, statusType } from '@const/enumTypes';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Application } from './application.model';
import { Dashboard } from './dashboard.model';
import { Form } from './form.model';
import { Role } from './role.model';
import { Workflow } from './workflow.model';
import { Record } from './record.model';
import { Resource } from './resource.model';
import { ReferenceData } from './referenceData.model';

/** Interface for the page context */
export type PageContextT = (
  | {
      refData: mongoose.Types.ObjectId | ReferenceData;
    }
  | {
      resource: mongoose.Types.ObjectId | Resource;
    }
) & {
  displayField: string;
};

/** Page documents interface declaration */
export interface Page extends Document {
  kind: 'Page';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  status?: any;
  content: mongoose.Types.ObjectId | Form | Workflow | Dashboard;
  context: PageContextT;
  contentWithContext: ((
    | {
        // The element string is the value for the value field of the refData
        element: string | number;
      }
    | {
        record: mongoose.Types.ObjectId | Record;
      }
  ) & {
    content: mongoose.Types.ObjectId | Form | Workflow | Dashboard;
  })[];
  permissions?: {
    canSee?: (mongoose.Types.ObjectId | Role)[];
    canUpdate?: (mongoose.Types.ObjectId | Role)[];
    canDelete?: (mongoose.Types.ObjectId | Role)[];
  };
  visible: boolean;
}

/** Mongoose page schema declaration */
const pageSchema = new Schema<Page>(
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
    // Can be either a workflow, a dashboard or a form ID
    content: mongoose.Schema.Types.ObjectId,
    context: {
      refData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReferenceData',
      },
      resource: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
      },
      displayField: String,
    },
    contentWithContext: [
      {
        element: mongoose.Schema.Types.Mixed,
        record: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Record',
        },
        content: {
          type: mongoose.Schema.Types.ObjectId,
        },
        _id: false,
      },
    ],
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
    visible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// handle cascading deletion and references deletion for pages
addOnBeforeDeleteMany(pageSchema, async (pages) => {
  // CASCADE DELETION
  // Delete the dependant workflows
  const workflows = pages
    .filter((page) => page.content && page.type === contentType.workflow)
    .map((page) => page.content);

  // Delete the dependant dashboards
  const dashboards = pages
    .filter((page) => page.content && page.type === contentType.dashboard)
    .map((page) => page.content);

  // Delete workflows and dashboards with context
  pages.forEach((page) => {
    if (page.contentWithContext) {
      page.contentWithContext.forEach((contentWithContext) => {
        if (!contentWithContext.content) return;
        // Shouldn't matter if we add the ids to be deleted to the both arrays
        workflows.push(contentWithContext.content);
        dashboards.push(contentWithContext.content);
      });
    }
  });

  if (!!workflows) {
    const workflowData = await Workflow.find({ _id: { $in: workflows } });
    workflowData.map(async function (items) {
      if (!!items.status && items.status === statusType.archived) {
        await Workflow.deleteOne(items._id);
        // REFERENCES DELETION
        // Delete references to the pages in applications containing these pages
        await Application.updateMany(
          { pages: { $in: pages } },
          //{ modifiedAt: new Date(), $pull: { pages: { $in: pages } } }
          { $pull: { pages: { $in: pages } } }
        );
      } else {
        await Workflow.findByIdAndUpdate(
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

  if (!!dashboards) {
    const dashboardData = await Dashboard.find({ _id: { $in: dashboards } });
    dashboardData.map(async function (items) {
      if (!!items.status && items.status === statusType.archived) {
        await Dashboard.deleteOne(items._id);
        // REFERENCES DELETION
        // Delete references to the pages in applications containing these pages
        await Application.updateMany(
          { pages: { $in: pages } },
          //{ modifiedAt: new Date(), $pull: { pages: { $in: pages } } }
          { $pull: { pages: { $in: pages } } }
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

  // if (workflows) await Workflow.deleteMany({ _id: { $in: workflows } });
  // if (dashboards) await Dashboard.deleteMany({ _id: { $in: dashboards } });
});

pageSchema.plugin(accessibleRecordsPlugin);

/** Mongoose page model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>(
  'Page',
  pageSchema
);
