import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationType,
  customNotificationLastExecutionStatus,
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
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(customNotificationStatus),
      required: true,
    },
    lastExecution: Date,
    lastExecutionStatus: {
      type: String,
      enum: Object.values(customNotificationLastExecutionStatus),
      required: true,
    },
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
  schedule: string;
  notificationType: string;
  resource: mongoose.Types.ObjectId;
  layout: mongoose.Types.ObjectId;
  template: mongoose.Types.ObjectId;
  recipients: any;
  status: string;
  lastExecution?: Date;
  lastExecutionStatus: string;
  createdAt?: Date;
  modifiedAt?: Date;
}
