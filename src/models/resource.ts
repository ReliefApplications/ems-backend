import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const resourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: Date,
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
  fields: {
    // name of field, id if external resource
    type: [mongoose.Schema.Types.Mixed],
  },
});

export interface Resource extends Document {
  kind: 'Resource';
  name: string;
  createdAt: Date;
  permissions: {
    canSee?: any[],
    canUpdate?: any[],
    canDelete?: any[]
  },
  fields: any[];
}

resourceSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Resource = mongoose.model<Resource, AccessibleRecordModel<Resource>>('Resource', resourceSchema);
