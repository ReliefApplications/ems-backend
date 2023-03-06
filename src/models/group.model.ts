import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose group schema definition */
const groupSchema = new Schema<Group>(
  {
    title: String,
    description: String,
    oid: String,
    // TODO: add roles array (out of scope for this ticket)
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

/** Group documents interface definition */
export interface Group extends Document {
  kind: 'Group';
  title: string;
  oid: string;
  description: string;
  createdAt: Date;
  modifiedAt: Date;
}

groupSchema.plugin(accessibleRecordsPlugin);

/** Mongoose group model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Group = mongoose.model<Group, AccessibleRecordModel<Group>>(
  'Group',
  groupSchema
);
