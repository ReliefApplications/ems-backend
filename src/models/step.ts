import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/enumTypes';

const stepSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  type: {
    type: String,
    enum: Object.values(contentType),
  },
  // Can be either a dashboard or a form ID
  content: mongoose.Schema.Types.ObjectId,
  permissions: {
    canSee: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    }],
    canUpdate: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    }],
    canDelete: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    }],
  },
});

export interface Step extends Document {
  kind: 'Step';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  content: any;
  permissions: {
    canSee?: any[],
    canUpdate?: any[],
    canDelete?: any[]
  },
  canSee?: any;
  canUpdate?: any;
  canDelete?: any;
}

stepSchema.plugin(accessibleRecordsPlugin);
export const Step = mongoose.model<Step, AccessibleRecordModel<Step>>('Step', stepSchema);
