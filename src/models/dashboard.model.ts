import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Dashboard documents interface declaration */
export interface Dashboard extends Document {
  kind: 'Dashboard';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  showFilter?: boolean;
  buttons?: {
    text: string;
    href: string;
    variant: string;
    category: string;
    openInNewTab: boolean;
  }[];
}

/** Mongoose dashboard schema declaration */
const dashboardSchema = new Schema<Dashboard>(
  {
    name: String,
    structure: mongoose.Schema.Types.Mixed,
    showFilter: Boolean,
    buttons: [
      {
        text: String,
        href: String,
        variant: String,
        category: String,
        openInNewTab: Boolean,
      },
    ],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

dashboardSchema.plugin(accessibleRecordsPlugin);

/** Mongoose dashboard model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Dashboard = mongoose.model<
  Dashboard,
  AccessibleRecordModel<Dashboard>
>('Dashboard', dashboardSchema);
