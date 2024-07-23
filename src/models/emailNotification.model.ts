/* eslint-disable @typescript-eslint/naming-convention */
import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationLastExecutionStatus,
  customNotificationRecipientsType,
  notificationsType,
} from '@const/enumTypes';
import { AccessibleRecordModel } from '@casl/mongoose';

/**
 *DataSet interface
 */
export interface Dataset {
  name: string;
  resource: string;
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
}

/**
 *EmailLayout interface
 */
export interface EmailLayout {
  subject: string;
  header?: any;
  body?: any;
  banner?: any;
  footer?: any;
}

/**
 * Interface representing a distribution list configured for an email template
 */
export interface EmailDistributionListQuery {
  name: string;
  to: DistributionListSource;
  cc?: DistributionListSource;
  bcc?: DistributionListSource;
}

/**
 * Interface representing either a filter definition used to fetch emails, a static list of emails, or both
 */
interface DistributionListSource {
  resource?: string;
  query?: {
    name: string;
    filter: any;
    fields: any[];
  };
  inputEmails?: string[];
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
  emailDistributionList: EmailDistributionListQuery;
  emailLayout: EmailLayout;
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
        pageSize: { type: mongoose.Schema.Types.Number },
        tableStyle: { type: mongoose.Schema.Types.Mixed },
        blockType: { type: mongoose.Schema.Types.Mixed },
        textStyle: { type: mongoose.Schema.Types.Mixed },
        sendAsAttachment: { type: Boolean, default: false },
        individualEmail: { type: Boolean, default: false },
      },
    ],
    emailDistributionList: {
      name: String,
      to: {
        resource: String,
        query: {
          name: String,
          filter: { type: mongoose.Schema.Types.Mixed },
          fields: [{ type: mongoose.Schema.Types.Mixed }],
        },
        inputEmails: { type: [String] },
      },
      cc: {
        resource: String,
        query: {
          name: String,
          filter: { type: mongoose.Schema.Types.Mixed },
          fields: [{ type: mongoose.Schema.Types.Mixed }],
        },
        inputEmails: { type: [String] },
      },
      bcc: {
        resource: String,
        query: {
          name: String,
          filter: { type: mongoose.Schema.Types.Mixed },
          fields: [{ type: mongoose.Schema.Types.Mixed }],
        },
        inputEmails: { type: [String] },
      },
    },
    emailLayout: {
      subject: String,
      header: {
        type: mongoose.Schema.Types.Mixed,
      },
      body: { type: mongoose.Schema.Types.Mixed },
      banner: { type: mongoose.Schema.Types.Mixed },
      footer: {
        type: mongoose.Schema.Types.Mixed,
      },
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

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailNotification = mongoose.model<
  EmailNotification,
  AccessibleRecordModel<EmailNotification>
>('EmailNotification', emailNotificationSchema);
