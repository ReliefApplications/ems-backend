import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

const dashboardSchema = new Schema({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  structure: mongoose.Schema.Types.Mixed,
});

export interface Dashboard extends Document {
  kind: 'Dashboard';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
}

dashboardSchema.plugin(accessibleRecordsPlugin);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Dashboard = mongoose.model<Dashboard, AccessibleRecordModel<Dashboard>>('Dashboard', dashboardSchema);
