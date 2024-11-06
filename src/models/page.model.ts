import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import { contentType } from '@const/enumTypes';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { has } from 'lodash';
import mongoose, { Document, Schema } from 'mongoose';
import { Application } from './application.model';
import { Dashboard } from './dashboard.model';
import { Form } from './form.model';
import { Button, buttonSchema } from './quickActions.model';
import { Record } from './record.model';
import { ReferenceData } from './referenceData.model';
import { Resource } from './resource.model';
import { Role } from './role.model';
import { Workflow } from './workflow.model';

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
  icon: string;
  showName?: boolean;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  content: mongoose.Types.ObjectId | Form | Workflow | Dashboard;
  context: PageContextT;
  buttons?: Button[];
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
  archived: boolean;
  archivedAt?: Date;
}

/** Mongoose page schema declaration */
const pageSchema = new Schema<Page>(
  {
    name: String,
    icon: String,
    showName: Boolean,
    type: {
      type: String,
      enum: Object.values(contentType),
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
    buttons: [buttonSchema],
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

// We need to declare it like that, otherwise we cannot access the 'this'.
pageSchema.pre(['updateOne', 'findOneAndUpdate'], async function () {
  const update = this.getUpdate();
  if (has(update, 'archived')) {
    const page: Page = await this.clone().findOne();
    switch (page.type) {
      case contentType.workflow: {
        const workflow = await Workflow.findById(page.content);
        if (workflow) {
          // eslint-disable-next-line @typescript-eslint/dot-notation
          if (update['archived']) {
            await workflow.updateOne({
              archived: true,
              // eslint-disable-next-line @typescript-eslint/dot-notation
              archivedAt: update['archivedAt'],
            });
          } else {
            await workflow.updateOne({
              archived: false,
              archivedAt: null,
            });
          }
        }
        break;
      }
      case contentType.dashboard: {
        const dashboard = await Dashboard.findById(page.content);
        if (dashboard) {
          // eslint-disable-next-line @typescript-eslint/dot-notation
          if (update['archived']) {
            dashboard.archived = true;
            // eslint-disable-next-line @typescript-eslint/dot-notation
            dashboard.archivedAt = update['archivedAt'];
            await dashboard.save();
          } else {
            dashboard.archived = false;
            // eslint-disable-next-line @typescript-eslint/dot-notation
            dashboard.archivedAt = null;
            await dashboard.save();
          }
        }
        if (page.contentWithContext) {
          const dashboards: Dashboard[] = [];
          page.contentWithContext.forEach((item: any) => {
            if (item.content) {
              dashboards.push(item.content);
            }
          });
          // eslint-disable-next-line @typescript-eslint/dot-notation
          if (update['archived']) {
            await Dashboard.updateMany(
              { _id: { $in: dashboards } },
              {
                $set: {
                  archived: true,
                  // eslint-disable-next-line @typescript-eslint/dot-notation
                  archivedAt: update['archivedAt'],
                },
              }
            );
          } else {
            await Dashboard.updateMany(
              { _id: { $in: dashboards } },
              {
                $set: {
                  archived: false,
                  archivedAt: null,
                },
              }
            );
          }
        }
        break;
      }
      default: {
        break;
      }
    }
  }
});

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

  if (workflows) await Workflow.deleteMany({ _id: { $in: workflows } });
  if (dashboards) await Dashboard.deleteMany({ _id: { $in: dashboards } });

  // REFERENCES DELETION
  // Delete references to the pages in applications containing these pages
  await Application.updateMany(
    { pages: { $in: pages } },
    //{ modifiedAt: new Date(), $pull: { pages: { $in: pages } } }
    { $pull: { pages: { $in: pages } } }
  );
});

pageSchema.plugin(accessibleRecordsPlugin);

/** Mongoose page model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>(
  'Page',
  pageSchema
);
