import {
  accessibleFieldsPlugin,
  AccessibleRecordModel,
  accessibleRecordsPlugin,
  AccessibleFieldsModel,
  AccessibleFieldsDocument,
} from '@casl/mongoose';
import mongoose, { Schema } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { Version } from './version.model';

/** Record documents interface declaration */
export interface Record extends AccessibleFieldsDocument {
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
    canSee?: any[];
    // {
    //     role: any,
    //     attributes: any
    // }[]
    canUpdate?: any[];
    canDelete?: any[];
  };
  createdBy?: any;
}

/** Mongoose record schema declaration */
const recordSchema = new Schema<Record>(
  {
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
    createdBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      roles: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Role',
      },
      positionAttributes: [
        {
          value: String,
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PositionAttributeCategory',
          },
        },
      ],
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);
recordSchema.index(
  { incrementalId: 1, resource: 1 },
  { unique: true, partialFilterExpression: { resource: { $exists: true } } }
);

// handle cascading deletion
addOnBeforeDeleteMany(recordSchema, async (records) => {
  const versions = records.reduce((acc, rec) => acc.concat(rec.versions), []);
  if (versions) await Version.deleteMany({ _id: { $in: versions } });
});

recordSchema.index({ incrementalId: 1, form: 1 });
recordSchema.plugin(accessibleRecordsPlugin);
recordSchema.plugin(accessibleFieldsPlugin);

/** Mongoose record model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Record = mongoose.model<
  Record,
  AccessibleFieldsModel<Record> & AccessibleRecordModel<Record>
>('Record', recordSchema);
