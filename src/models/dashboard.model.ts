import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose button interface declaration */
interface Button {
  text: string;
  href: string;
  variant: string;
  category: string;
  openInNewTab: boolean;
}

/** Dashboard documents interface declaration */
export interface Dashboard extends Document {
  kind: 'Dashboard';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  showFilter?: boolean;
  buttons?: Button[];
  archived: boolean;
  archivedAt?: Date;
  gridOptions?: any;
  filterVariant?: string;
  closable?: boolean;
}

/** Mongoose button schema declaration */
const buttonSchema = new Schema<Button>(
  {
    text: String,
    href: String,
    variant: String,
    category: String,
    openInNewTab: Boolean,
  },
  { _id: false }
);

/** Mongoose dashboard schema declaration */
const dashboardSchema = new Schema<Dashboard>(
  {
    name: String,
    structure: mongoose.Schema.Types.Mixed,
    showFilter: Boolean,
    filterVariant: String,
    closable: Boolean,
    buttons: [buttonSchema],
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      expires: 2592000,
    },
    gridOptions: mongoose.Schema.Types.Mixed,
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
