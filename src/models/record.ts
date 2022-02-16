import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const recordSchema = new Schema({
  incrementalId: {
    type: String,
    required: true,
  },
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
  },
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: false,
  },
  createdAt: Date,
  modifiedAt: Date,
  createdBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    roles: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Role',
    },
    positionAttributes: [{
      value: String,
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PositionAttributeCategory',
      },
    }],
  },
  archived: {
    type: Boolean,
    default: false,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  versions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Version',
  },
});
recordSchema.index({ incrementalId: 1, resource: 1 }, { unique: true, partialFilterExpression: { resource: { $exists: true } } });
recordSchema.index({ incrementalId: 1, form: 1 });

export interface Record extends Document {
  kind: 'Record';
  incrementalId: string;
  form: any;
  resource: any;
  createdAt: Date;
  modifiedAt: Date;
  archived: boolean;
  data: any;
  versions: any;
  permissions: {
    canSee?: any[],
    // {
    //     role: any,
    //     attributes: any
    // }[]
    canUpdate?: any[],
    canDelete?: any[]
  },
  createdBy?: any;
  lastUpdatedBy?: any;
}

recordSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Record = mongoose.model<Record, AccessibleRecordModel<Record>>('Record', recordSchema);
