import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Form } from './form.model';
import { layoutSchema } from './layout.model';
import { aggregationSchema } from './aggregation.model';
import { Record } from './record.model';
import { deleteFolder } from '@utils/files/deleteFolder';

import { BlobServiceClient } from '@azure/storage-blob';
import config from 'config';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

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
  for (const resource of resources) {
    if (resource.fields && resource.fields.length > 0) {
      await resource.fields.map(async function (item) {
        if (!!item && item.type == 'file' && !!item.name) {
          const records = await Record.find({ resource: resource.id });
          if (records && records.length > 0) {
            records.map(async function (recordData) {
              if (!!recordData && !!recordData.data) {
                Object.keys(recordData.data).filter(function (key) {
                  if (!!key && key == item.name) {
                    if (!!recordData.data[key] && recordData.data[key].length) {
                      recordData.data[key].map(async function (fileData) {
                        if (!!fileData && !!fileData.content) {
                          try {
                            await deleteFolder('forms', fileData.content);
                          } catch (err) {}
                        }
                      });
                    }
                  }
                });
              }
            });
          }
        }
      });
    }
  }

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
