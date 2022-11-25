import mongoose, { Schema, Document } from 'mongoose';
import {
  customNotificationStatus,
  customNotificationType,
} from '@const/enumTypes';

/** Mongoose custom notification schema declaration */
export const customNotificationSchema = new Schema(
  {
    name: String,
    description: String,
    schedule: String,
    notificationType: {
      type: String,
      enum: Object.values(customNotificationType),
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
    },
    layout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Layout',
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
    },
    recipients: mongoose.Schema.Types.Mixed,
    enabled: {
      type: Boolean,
      default: false,
    },
    lastExecution: Date,
    status: {
      type: String,
      enum: Object.values(customNotificationStatus),
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
  enabled: boolean;
  lastExecution?: Date;
  status: string;
  createdAt?: Date;
  modifiedAt?: Date;
}
