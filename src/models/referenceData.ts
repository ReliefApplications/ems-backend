import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { referenceDataType } from '../const/enumTypes';

/** Reference data interface. */
export interface ReferenceData extends Document {
  kind: 'ReferenceData';
  name: string;
  graphQLName: string;
  modifiedAt: Date;
  type: string;
  apiConfiguration: string;
  query: string;
  fields: string[];
  valueField: string;
  path: string;
  data: any;
  graphQLFilter: string;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
}

/**
 * Reference data model.
 * Reference data are coming from external APIs.
 */
const referenceDataSchema = new Schema<ReferenceData>({
  name: String,
  graphQLName: String,
  modifiedAt: Date,
  type: {
    type: String,
    enum: Object.values(referenceDataType),
  },
  apiConfiguration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiConfiguration',
  },
  query: String,
  fields: [String],
  valueField: String,
  path: String,
  data: mongoose.Schema.Types.Mixed,
  graphQLFilter: String,
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
});

/** Defines unicity of reference data schema. */
referenceDataSchema.index({ name: 1 }, { unique: true });
referenceDataSchema.index({ graphQLName: 1 }, { unique: true });
referenceDataSchema.plugin(accessibleRecordsPlugin);

/** Mongoose reference data model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ReferenceData = mongoose.model<
  ReferenceData,
  AccessibleRecordModel<ReferenceData>
>('ReferenceData', referenceDataSchema);
