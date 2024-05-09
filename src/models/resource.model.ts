import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Form } from './form.model';
import { layoutSchema } from './layout.model';
import { aggregationSchema } from './aggregation.model';
import { Record } from './record.model';
import { deleteFolder } from '@utils/files/deleteFolder';
import { logger } from '@services/logger.service';

/** Resource documents interface definition */
export interface Resource extends Document {
  kind: 'Resource';
  name: string;
  createdAt: Date;
  permissions: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
    canDownload?: any[];
    canCreateRecords?: any[];
    canSeeRecords?: any[];
    canUpdateRecords?: any[];
    canDeleteRecords?: any[];
    canDownloadRecords?: any[];
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
      canDownload: [
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
      canDownloadRecords: [
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
      type: mongoose.Schema.Types.Mixed,
      default: [],
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
  const resourcesIds = resources.map((r) => r._id);
  try {
    const forms = await Form.find({ resource: { $in: resourcesIds } });

    // adding try catch because on envs without storage this was throwing an error
    // and preventing the deletion of forms and records
    try {
      for (const form of forms) {
        await deleteFolder('forms', form.id);
        logger.info(`Files from form ${form.id} successfully removed.`);
      }
    } catch (err) {
      logger.error(`Deletion of files from forms failed: ${err.message}`);
    }

    await Form.deleteMany({ resource: { $in: resourcesIds } });
    await Record.deleteMany({ resource: { $in: resourcesIds } });
  } catch (err) {
    logger.error(`Deletion of resources failed: ${err.message}`);
  }
});

resourceSchema.index({ createdAt: 1 });

resourceSchema.plugin(accessibleRecordsPlugin);

/** Mongoose resource model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Resource = mongoose.model<
  Resource,
  AccessibleRecordModel<Resource>
>('Resource', resourceSchema);
