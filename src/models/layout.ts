import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const layoutSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  query: {
    type: mongoose.Schema.Types.Mixed,
  },
});

export interface Layout extends Document {
  kind: 'Layout';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  query?: any;
}

layoutSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Layout = mongoose.model<Layout, AccessibleRecordModel<Layout>>(
  'Layout',
  layoutSchema
);
