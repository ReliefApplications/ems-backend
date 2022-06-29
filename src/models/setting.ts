import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose settings schema declaration */
const userManagementSchema = new Schema({
  localAuthentication: {
    type: Boolean,
    default: true,
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
  modifiedAt: Date,
});

/** Mongoose settings schema declaration */
const settingSchema = new Schema({
  userManagement: userManagementSchema,
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
    localAuthentication?: boolean;
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
