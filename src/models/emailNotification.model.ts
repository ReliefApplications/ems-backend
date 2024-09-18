import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationLastExecutionStatus,
  customNotificationRecipientsType,
  notificationsType,
} from '@const/enumTypes';
import { AccessibleRecordModel } from '@casl/mongoose';
import { EmailDistributionList } from '@models/emailDistributionlists.model';
import { ICustomTemplate } from '@models/customTemplate.model';

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
  emailLayout: mongoose.Schema.Types.ObjectId | ICustomTemplate; // Reference to CustomTemplate;
  recipientsType: string;
  status: string;
  lastExecution?: Date;
  lastExecutionStatus: string;
  isDeleted: number;
  createdAt?: Date;
  modifiedAt?: Date;
  isDraft?: boolean;
  draftStepper?: number;
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

emailNotificationSchema.index({ name: 1, applicationId: 1 }, { unique: true });

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailNotification = mongoose.model<
  EmailNotification,
  AccessibleRecordModel<EmailNotification>
>('EmailNotification', emailNotificationSchema);
