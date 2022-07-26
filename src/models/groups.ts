import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose group schema definition */
const groupSchema = new Schema<Group>({
  title: String,
  positions: [
    {
      position: String,
      _id: true,
    },
  ],
  modifiedAt: Date,
  createdAt: Date,
});

/** Group documents interface definition */
export interface Group extends Document {
  kind: 'Group';
  title: string;
  positions?: { position: string; id: string }[];
  createdAt: Date;
  modifiedAt: Date;
}

groupSchema.plugin(accessibleRecordsPlugin);

/** Mongoose user model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const User = mongoose.model<Group, AccessibleRecordModel<Group>>(
  'Group',
  groupSchema
);
