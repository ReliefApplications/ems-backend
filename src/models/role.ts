import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose role schema definition */
const roleSchema = new Schema({
  title: String,
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
  },
  permissions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Permission',
  },
  channels: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Channel',
  },
});

roleSchema.index({ title: 1, application: 1 }, { unique: true });

/** Role documents interface definition */
export interface Role extends Document {
  kind: 'Role';
  title: string;
  application: any;
  permissions: any[];
  channels: any[];
}

roleSchema.plugin(accessibleRecordsPlugin);

/** Mongoose role model*/
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Role = mongoose.model<Role, AccessibleRecordModel<Role>>(
  'Role',
  roleSchema
);
