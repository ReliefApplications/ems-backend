import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationType,
  customNotificationLastExecutionStatus,
  customNotificationRecipientsType,
} from '@const/enumTypes';

/** Mongoose custom notification schema declaration */
export const customNotificationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    schedule: {
      type: String,
      required: true,
    },
    notificationType: {
      type: String,
      enum: Object.values(customNotificationType),
      required: true,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    layout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Layout',
      required: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },
    recipients: {
      type: String,
      required: true,
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
    onRecordCreation: Boolean,
    onRecordUpdate: Boolean,
    applicationTrigger: Boolean,
    redirect: mongoose.Schema.Types.Mixed,
    filter: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** custom notification documents interface declaration */
export interface CustomNotification extends Document {
  kind: 'CustomNotification';
  name: string;
  description: string;
  schedule?: string;
  notificationType: string;
  resource: mongoose.Types.ObjectId;
  layout: mongoose.Types.ObjectId;
  template: mongoose.Types.ObjectId;
  recipients: string;
  recipientsType: string;
  status: string;
  lastExecution?: Date;
  lastExecutionStatus: string;
  createdAt?: Date;
  modifiedAt?: Date;
  onRecordCreation?: boolean;
  onRecordUpdate?: boolean; // record deletion counts as an update
  applicationTrigger?: boolean;
  filter?: any;
  redirect?: any;
  // redirect?: {
  //   active: boolean;
  //   type: string; // 'url' | 'recordIds'
  //   url?: string;
  //   recordIds?: string[];
  // };
}
