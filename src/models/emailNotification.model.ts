import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationLastExecutionStatus,
  customNotificationRecipientsType,
  notificationsType,
} from '@const/enumTypes';
import { AccessibleRecordModel } from '@casl/mongoose';

/**
 *Resource interface
 */
interface Resource {
  id: Schema.Types.ObjectId;
  name: string;
}

/**
 *DataSet interface
 */
interface DataSet {
  name: string;
  resource: Resource;
  filter: any;
  pageSize?: number;
  fields?: any[];
  style?: any[];
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
}

/**
 *EmailLayout interface
 */
interface EmailLayout {
  subject: string;
  header?: any;
  body?: any;
  banner?: any;
  footer?: any;
}

/**
 *Recipients interface
 */
interface Recipients {
  distributionListName: string;
  To: string[];
  Cc: string[];
  Bcc: string[];
}

/** Mongoose email notification schema declaration */
export const emailNotificationSchema = new Schema(
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
    dataSets: [
      {
        name: String,
        resource: {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resource',
            required: true,
          },
          name: String,
        },
        filter: { type: mongoose.Schema.Types.Mixed },
        pageSize: { type: mongoose.Schema.Types.Number },
        fields: [{ type: mongoose.Schema.Types.Mixed }],
        tableStyle: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    recipients: {
      distributionListName: String,
      To: [{ type: String }],
      Cc: [{ type: String }],
      Bcc: [{ type: String }],
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** custom notification documents interface declaration */
export interface EmailNotification extends Document {
  kind: 'EmailNotification';
  name: string;
  description: string;
  schedule: string;
  createdBy: { name: string; email: string };
  notificationType: string;
  dataSets: DataSet[];
  recipients: Recipients;
  emailLayout: EmailLayout;
  recipientsType: string;
  status: string;
  lastExecution?: Date;
  lastExecutionStatus: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const EmailNotification = mongoose.model<
  EmailNotification,
  AccessibleRecordModel<EmailNotification>
>('EmailNotification', emailNotificationSchema);
