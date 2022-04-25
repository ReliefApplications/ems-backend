import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { referenceDataType } from '../const/enumTypes';

/**
 * Reference data model.
 * Reference data are coming from external APIs.
 */
const referenceDataSchema = new Schema({
  name: String,
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
/** Defines unicity of refence data schema. */
referenceDataSchema.index({ name: 1 }, { unique: true });

/**
 * Reference data interface.
 */
export interface ReferenceData extends Document {
  kind: 'ReferenceData';
  name: string;
  type: string;
  apiConfiguration: string;
  query: string;
  fields: string[];
  valueField: string;
  path: string;
  data: any;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
}

referenceDataSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ReferenceData = mongoose.model<
  ReferenceData,
  AccessibleRecordModel<ReferenceData>
>('ReferenceData', referenceDataSchema);
