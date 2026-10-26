import {
  accessibleFieldsPlugin,
  AccessibleRecordModel,
  accessibleRecordsPlugin,
  AccessibleFieldsModel,
  AccessibleFieldsDocument,
} from '@casl/mongoose';
import mongoose, { Schema } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import {
  getModelStorage,
  getStorageConnection,
} from '@utils/models/storageConnection';
import { getVersionModel } from './version.model';
import { Form } from './form.model';
import { User } from './user.model';

/** Record documents interface declaration */
// eslint-disable-next-line deprecation/deprecation
export interface Record extends AccessibleFieldsDocument {
  kind: 'Record';
  incrementalId?: string;
  form: any;
  _form: Form;
  resource: any;
  createdAt: Date;
  modifiedAt: Date;
  archived: boolean;
  draft: boolean;
  data: any;
  versions: any;
  /**
   * Name of the storage database, when the records of the form are stored in
   * another database of the cluster. Set on the records of the storage
   * database, and on their stubs in the main database.
   */
  storage?: string;
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
  _createdBy?: { user: User };
  _lastUpdatedBy?: { user: User };
  lastUpdateForm?: any;
  _lastUpdateForm?: Form;
}

/** Mongoose record schema declaration */
export const recordSchema = new Schema<Record>(
  {
    incrementalId: {
      type: String,
      required: false,
    },
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
    },
    _form: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdateForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
    },
    _lastUpdateForm: {
      type: mongoose.Schema.Types.Mixed,
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
    _createdBy: {
      type: mongoose.Schema.Types.Mixed,
    },
    _lastUpdatedBy: {
      type: mongoose.Schema.Types.Mixed,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    draft: {
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
    storage: {
      type: String,
      // Records created through the model of a storage database carry its name
      default(this: any) {
        return getModelStorage(this.constructor);
      },
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);
recordSchema.index(
  { incrementalId: 1, resource: 1 },
  {
    unique: true,
    // Drafts are excluded: they are stored without incremental id
    partialFilterExpression: {
      resource: { $exists: true },
      incrementalId: { $exists: true },
    },
  }
);

recordSchema.index({ '$**': 'text' });
recordSchema.index({ 'data.$**': 1 });

recordSchema.index({ archived: 1, form: 1, resource: 1, createdAt: 1 });
recordSchema.index({ resource: 1, archived: 1 });
recordSchema.index({ draft: 1, form: 1, resource: 1, createdAt: 1 });
recordSchema.index(
  { form: 1, 'createdBy.user': 1, createdAt: 1, _id: 1 },
  { partialFilterExpression: { draft: true } }
);
recordSchema.index(
  { form: 1, 'createdBy.user': 1, modifiedAt: 1, _id: 1 },
  { partialFilterExpression: { draft: true } }
);
recordSchema.index({ createdAt: 1 });
recordSchema.index({ form: 1 });
recordSchema.index({ versions: 1 });

// handle cascading deletion
addOnBeforeDeleteMany(recordSchema, async (records) => {
  // The documents come from the model the deletion was called on: either the
  // main database, or a storage database. Stubs (the documents of the main
  // database pointing to a storage database) have no versions of their own:
  // their record owns them
  const model: any = (records[0] as any).constructor;
  const isMain = model?.db === mongoose.connection;
  const owned = records.filter((rec) => !(isMain && rec.storage));
  const versions = owned.reduce(
    (acc, rec) => acc.concat(rec.versions || []),
    []
  );
  if (!versions.length) return;
  // Cloned & converted records share versions with their source record, so
  // only delete the versions that no remaining record still uses
  const sharedVersions = await model.distinct('versions', {
    _id: { $nin: records.map((rec) => rec._id) },
    versions: { $in: versions },
  });
  const shared = new Set(sharedVersions.map((x) => String(x)));
  const toDelete = versions.filter((x) => !shared.has(String(x)));
  // The versions of a record live in the database of the record
  await getVersionModel(getModelStorage(model)).deleteMany({
    _id: { $in: toDelete },
  });
});

recordSchema.index({ storage: 1 }, { sparse: true });

recordSchema.index({ incrementalId: 1, form: 1 });
recordSchema.plugin(accessibleRecordsPlugin);
recordSchema.plugin(accessibleFieldsPlugin);

/** Mongoose record model type */
export type RecordModel = AccessibleFieldsModel<Record> &
  AccessibleRecordModel<Record>;

/** Mongoose record model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Record = mongoose.model<Record, RecordModel>(
  'Record',
  recordSchema
);

/**
 * Gets the record model of a storage: the shared `Record` model when there
 * is no storage, otherwise the `Record` model of the connection to the
 * storage database, compiled on its `records` collection with the same
 * schema, hooks and indexes.
 *
 * @param storage Name of the storage database, if the records have one
 * @returns Record model to use
 */
export const getRecordModel = (storage?: string | null): RecordModel => {
  if (!storage) {
    return Record;
  }
  const connection = getStorageConnection(storage);
  return (
    (connection.models.Record as RecordModel) ??
    connection.model<Record, RecordModel>(
      'Record',
      recordSchema,
      Record.collection.name
    )
  );
};
