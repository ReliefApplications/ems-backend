import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { layoutSchema } from './layout';

/** Mongoose resource schema definition */
const resourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: Date,
  permissions: {
    canSee: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canUpdate: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canDelete: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
  },
  fields: {
    // name of field, id if external resource
    type: [mongoose.Schema.Types.Mixed],
  },
  layouts: [layoutSchema],
});

/** Resource documents interface definition */
export interface Resource extends Document {
  kind: 'Resource';
  name: string;
  createdAt: Date;
  permissions: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
  fields: any[];
  layouts: any;
}

resourceSchema.plugin(accessibleRecordsPlugin);

/** Mongoose resource model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Resource = mongoose.model<
  Resource,
  AccessibleRecordModel<Resource>
>('Resource', resourceSchema);
