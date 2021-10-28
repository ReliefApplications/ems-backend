import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { contentType } from '../const/enumTypes';

const pageSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  type: {
    type: String,
    enum: Object.values(contentType),
  },
  // Can be either a workflow, a dashboard or a form ID
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

export interface Page extends Document {
  kind: 'Page';
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  content: any;
  permissions?: {
    canSee?: any[],
    canUpdate?: any[],
    canDelete?: any[]
  },
}

pageSchema.plugin(accessibleRecordsPlugin);
export const Page = mongoose.model<Page, AccessibleRecordModel<Page>>('Page', pageSchema);
