import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { authType, status } from '@const/enumTypes';

/** Mongoose api configuration schema declaration */
const apiConfigurationSchema = new Schema({
  name: String,
  status: {
    type: String,
    enum: Object.values(status),
  },
  authType: {
    type: String,
    enum: Object.values(authType),
  },
  endpoint: String,
  graphQLEndpoint: String,
  pingUrl: String,
  settings: mongoose.Schema.Types.Mixed,
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

apiConfigurationSchema.index({ name: 1 }, { unique: true });

/** Api configuration documents interface declaration */
export interface ApiConfiguration extends Document {
  kind: 'ApiConfiguration';
  name: string;
  status: string;
  authType: string;
  endpoint: string;
  graphQLEndpoint: string;
  pingUrl: string;
  settings: any;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
}

apiConfigurationSchema.plugin(accessibleRecordsPlugin);

/** Mongoose api configuration model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ApiConfiguration = mongoose.model<
  ApiConfiguration,
  AccessibleRecordModel<ApiConfiguration>
>('ApiConfiguration', apiConfigurationSchema);
