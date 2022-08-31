import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose settings schema declaration */
const userManagementSchema = new Schema({
  local: {
    type: Boolean,
    default: true,
  },
  apiConfiguration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiConfiguration',
  },
  serviceAPI: String,
  attributesMapping: [
    {
      field: String,
      path: String,
      value: mongoose.Schema.Types.Mixed,
      text: String,
    },
  ],
});

/** Mongoose settings schema declaration */
const settingSchema = new Schema({
  userManagement: userManagementSchema,
  modifiedAt: Date,
});

settingSchema.index({ name: 1 }, { unique: true });
settingSchema.plugin(accessibleRecordsPlugin);

/** Interface for Mapping element. */
export interface Mapping {
  field: string;
  path: string;
  value: any;
  text: string;
}

/** Interface for Mapping array. */
export type Mappings = Array<Mapping>;

/** Api configuration documents interface declaration */
export interface Setting extends Document {
  kind: 'Setting';
  userManagement?: {
    local?: boolean;
    apiConfiguration?: string;
    serviceAPI?: string;
    attributesMapping?: Mappings;
  };
  modifiedAt: Date;
}

/** Mongoose settings model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Setting = mongoose.model<Setting, AccessibleRecordModel<Setting>>(
  'Setting',
  settingSchema
);
