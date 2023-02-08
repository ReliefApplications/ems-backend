import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { status } from '@const/enumTypes';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Page } from './page.model';
import { Role } from './role.model';
import { Channel } from './channel.model';
import { Template, templateSchema } from './template.model';
import {
  CustomNotification,
  customNotificationSchema,
} from './customNotification.model';
import {
  DistributionList,
  distributionListSchema,
} from './distributionList.model';

/** Application documents interface declaration */
export interface Application extends Document {
  kind: 'Application';
  name?: string;
  createdAt: Date;
  modifiedAt: Date;
  status?: any;
  createdBy?: string;
  pages?: (mongoose.Types.ObjectId | Page)[];
  settings?: any;
  lockedBy?: string;
  permissions?: {
    canSee?: (mongoose.Types.ObjectId | Role)[];
    canUpdate?: (mongoose.Types.ObjectId | Role)[];
    canDelete?: (mongoose.Types.ObjectId | Role)[];
  };
  subscriptions?: {
    routingKey?: string;
    title: string;
    convertTo?: string;
    channel?: string;
  }[];
  templates?: Template[];
  distributionLists?: DistributionList[];
  customNotifications?: CustomNotification[];
}

/** Mongoose application schema declaration */
const applicationSchema = new Schema<Application>(
  {
    name: String,
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: Object.values(status),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pages: {
      // id of pages linked to this application
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Page',
    },
    settings: mongoose.Schema.Types.Mixed,
    description: String,
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
    subscriptions: [
      {
        routingKey: String,
        title: String,
        convertTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Form',
        },
        channel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Channel',
        },
      },
    ],
    templates: [templateSchema],
    distributionLists: [distributionListSchema],
    customNotifications: [customNotificationSchema],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// handle cascading deletion for applications
addOnBeforeDeleteMany(applicationSchema, async (applications) => {
  const pages = applications.reduce((acc, app) => acc.concat(app.pages), []);
  // Delete pages, roles and channels
  await Page.deleteMany({ _id: { $in: pages } });
  await Role.deleteMany({ application: { $in: applications } });
  await Channel.deleteMany({ application: { $in: applications } });
});

applicationSchema.index({ name: 1 }, { unique: true });
applicationSchema.plugin(accessibleRecordsPlugin);

/** Mongoose application model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Application = mongoose.model<
  Application,
  AccessibleRecordModel<Application>
>('Application', applicationSchema);
