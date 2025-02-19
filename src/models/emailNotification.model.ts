import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationLastExecutionStatus,
  customNotificationRecipientsType,
  notificationsType,
} from '@const/enumTypes';
import { AccessibleRecordModel } from '@casl/mongoose';
import { EmailDistributionList } from '@models/emailDistributionList.model';
import { CustomTemplate } from '@models/customTemplate.model';

/**
 *DataSet interface
 */
export interface Dataset {
  name: string;
  resource: string;
  reference?: string;
  query: {
    name: string;
    filter: any;
    fields: any[];
  };
  tableStyle: {
    tableStyle: string;
    theadStyle: string;
    tbodyStyle: string;
    thStyle: string;
    trStyle: string;
    tdStyle: string;
    labelStyle: string;
    tableDivStyle: string;
  };
  blockType: any;
  textStyle: any;
  sendAsAttachment: boolean;
  individualEmail: boolean;
  individualEmailFields?: any[];
  navigateToPage: boolean;
  navigateSettings: {
    field: string;
    pageUrl: string;
    title: string;
  };
}

/** Interface File */
export interface EmailNotificationFile {
  occurrence?: {
    id: string;
    name?: string;
  };
  driveId: string;
  itemId: string;
  fileName: string;
  clamAV?: string;
  fileFormat?: string;
  versionName?: string;
  fileSize: string;
  documentType?: any[];
  documentCategory?: any[];
  createdDate?: string;
  modifiedDate?: string;
}

/** Model for email File attachement response */
export interface EmailNotificationAttachment {
  sendAsAttachment: boolean;
  files?: EmailNotificationFile[];
}
/** custom notification documents interface declaration */
export interface EmailNotification extends Document {
  kind: 'EmailNotification';
  name: string;
  description: string;
  schedule: string;
  applicationId: mongoose.Schema.Types.ObjectId;
  createdBy: { name: string; email: string };
  notificationType: string;
  datasets: Dataset[];
  emailDistributionList: mongoose.Schema.Types.ObjectId | EmailDistributionList; // Reference to EmailDistributionList
  subscriptionList: string[];
  restrictSubscription: boolean;
  emailLayout: mongoose.Schema.Types.ObjectId | CustomTemplate; // Reference to CustomTemplate;
  recipientsType: string;
  status: string;
  lastExecution?: Date;
  lastExecutionStatus: string;
  isDeleted: number;
  createdAt?: Date;
  modifiedAt?: Date;
  isDraft?: boolean;
  draftStepper?: number;
  attachments?: EmailNotificationAttachment;
}

/** Mongoose email notification schema declaration */
export const emailNotificationSchema = new Schema<EmailNotification>(
  {
    name: {
      type: String,
      required: true,
    },
    createdBy: {
      name: String,
      email: String,
    },
    notificationType: {
      type: String,
      enum: Object.values(notificationsType),
      required: true,
    },
    schedule: {
      type: String,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    datasets: [
      {
        name: String,
        resource: String,
        reference: String,
        query: {
          name: String,
          fields: [{ type: mongoose.Schema.Types.Mixed }],
          filter: { type: mongoose.Schema.Types.Mixed },
        },
        individualEmailFields: [{ type: mongoose.Schema.Types.Mixed }],
        pageSize: { type: mongoose.Schema.Types.Number },
        tableStyle: { type: mongoose.Schema.Types.Mixed },
        blockType: { type: mongoose.Schema.Types.Mixed },
        textStyle: { type: mongoose.Schema.Types.Mixed },
        sendAsAttachment: { type: Boolean, default: false },
        individualEmail: { type: Boolean, default: false },
        navigateToPage: {
          type: Boolean,
          default: false,
        },
        navigateSettings: {
          field: String,
          pageUrl: String,
          title: String,
        },
      },
    ],
    emailDistributionList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailDistributionList', // Reference to EmailDistributionList collection
    },
    subscriptionList: {
      type: [String],
    },
    restrictSubscription: {
      type: Boolean,
      default: false,
    },
    emailLayout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'customTemplate', // Reference to CustomTemplate collection
    },
    recipientsType: {
      type: String,
      enum: Object.values(customNotificationRecipientsType),
      default: customNotificationRecipientsType.email,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(customNotificationStatus),
      default: customNotificationStatus.active,
      required: true,
    },
    lastExecution: Date,
    lastExecutionStatus: {
      type: String,
      enum: Object.values(customNotificationLastExecutionStatus),
      default: customNotificationLastExecutionStatus.pending,
      required: true,
    },
    isDeleted: {
      type: Number,
      default: 0,
    },
    isDraft: {
      type: Boolean,
      required: true,
    },
    draftStepper: {
      type: Number,
    },
    attachments: {
      sendAsAttachment: { type: Boolean, default: false },
      files: [
        {
          occurrence: {
            id: { type: String },
            name: { type: String },
          },
          driveId: { type: String, required: true },
          itemId: { type: String, required: true },
          fileName: { type: String, required: true },
          clamAV: { type: String },
          fileFormat: { type: String },
          versionName: { type: String },
          fileSize: { type: String, required: true },
          documentType: [{ type: mongoose.Schema.Types.Mixed }],
          documentCategory: [{ type: mongoose.Schema.Types.Mixed }],
          createdDate: { type: String },
          modifiedDate: { type: String },
        },
      ],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

emailNotificationSchema.index({ name: 1, applicationId: 1 }, { unique: true });

/** Mongoose email notification model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailNotification = mongoose.model<
  EmailNotification,
  AccessibleRecordModel<EmailNotification>
>('EmailNotification', emailNotificationSchema);
