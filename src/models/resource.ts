import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '../utils/models/deletion';
import { Form } from './form';
import { layoutSchema } from './layout';
import { Record } from './record';

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

/** Mongoose resource schema definition */
const resourceSchema = new Schema<Resource>({
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

// handle cascading deletion for resources
addOnBeforeDeleteMany(resourceSchema, async (resources) => {
  await Form.deleteMany({ resource: { $in: resources } });
  await Record.deleteMany({ resource: { $in: resources } });
});

resourceSchema.plugin(accessibleRecordsPlugin);

/** Mongoose resource model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Resource = mongoose.model<
  Resource,
  AccessibleRecordModel<Resource>
>('Resource', resourceSchema);
