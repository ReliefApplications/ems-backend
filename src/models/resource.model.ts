import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Form } from './form.model';
import { layoutSchema } from './layout.model';
import { aggregationSchema } from './aggregation.model';
import { Record } from './record.model';

/** Resource documents interface definition */
export interface Resource extends Document {
  kind: 'Resource';
  name: string;
  createdAt: Date;
  permissions: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
    canCreateRecords?: any[];
    canSeeRecords?: any[];
    canUpdateRecords?: any[];
    canDeleteRecords?: any[];
  };
  fields: {
    permissions?: {
      canSee: any[];
      canUpdate: any[];
    };
    [key: string]: any;
  }[];
  layouts: any;
  aggregations: any;
}

/** Mongoose resource schema definition */
const resourceSchema = new Schema<Resource>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
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
      canCreateRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
      canSeeRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
      canUpdateRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
      canDeleteRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
    },
    fields: {
      // name of field, id if external resource
      type: [mongoose.Schema.Types.Mixed],
    },
    layouts: [layoutSchema],
    aggregations: [aggregationSchema],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

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
