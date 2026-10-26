import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { getStorageConnection } from '@utils/models/storageConnection';

/** Mongoose version schema declaration */
export const versionSchema = new Schema(
  {
    data: mongoose.Schema.Types.Mixed,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'createdAt' },
  }
);

/** Version documents interface declaration */
export interface Version extends Document {
  kind: 'Version';
  createdAt?: Date;
  data?: any;
  createdBy?: any;
}

versionSchema.plugin(accessibleRecordsPlugin);

/** Mongoose version model type */
export type VersionModel = AccessibleRecordModel<Version>;

/** Mongoose version model declaration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Version = mongoose.model<Version, VersionModel>(
  'Version',
  versionSchema
);

/**
 * Gets the version model of a storage: the shared `Version` model when
 * there is no storage, otherwise the `Version` model of the connection to
 * the storage database, compiled on its `versions` collection with the same
 * schema.
 *
 * @param storage Name of the storage database, if the records have one
 * @returns Version model to use
 */
export const getVersionModel = (storage?: string | null): VersionModel => {
  if (!storage) {
    return Version;
  }
  const connection = getStorageConnection(storage);
  return (
    (connection.models.Version as VersionModel) ??
    connection.model<Version, VersionModel>(
      'Version',
      versionSchema,
      Version.collection.name
    )
  );
};
