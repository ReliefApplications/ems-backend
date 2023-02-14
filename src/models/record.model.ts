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
import { MongoDataSource } from 'apollo-datasource-mongodb';

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

/**
 * Record data source for speed optimize.
 */
export class RecordDataSource extends MongoDataSource<Record> {
  /**
   * Get all records
   *
   * @param mongooseFilter is use to filter records
   * @param sort is use to sort records
   * @param limit is use to get specific limit recors
   * @returns All Records data.
   */
  async getRecords(mongooseFilter: any, sort: any, limit: any) {
    const query: any = this.model;

    const records = !!mongooseFilter
      ? !!sort
        ? !!limit
          ? await query.find(mongooseFilter).sort(sort).limit(limit)
          : await query.find(mongooseFilter).sort(sort)
        : !!limit
        ? await query.find(mongooseFilter).limit(limit)
        : await query.find(mongooseFilter)
      : !!sort
      ? !!limit
        ? await query.find().sort(sort).limit(limit)
        : await query.find().sort(sort)
      : !!limit
      ? await query.find().limit(limit)
      : await query.find();

    return records;
  }

  /**
   * Get record detail by where condition
   *
   * @param where is condition for get specific record
   * @returns Single record data.
   */
  async getRecordByField(where) {
    return this.model.findOne(where);
  }

  /**
   * Get record detail by id
   *
   * @param id is record id
   * @returns Single record data.
   */
  async getRecord(id) {
    return this.findOneById(id);
  }
}
