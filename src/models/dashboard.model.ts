import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';

/** Mongoose button interface declaration */
export interface Button {
  text: string;
  href: string;
  hasRoleRestriction: boolean;
  roles: string[];
  variant: string;
  category: string;
  openInNewTab: boolean;
}

/** Dashboard filter interface declaration */
interface Filter {
  variant?: string;
  show?: boolean;
  closable?: boolean;
  structure?: any;
  position?: string;
}

/** Dashboard documents interface declaration */
export interface Dashboard extends Document {
  kind: 'Dashboard';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  // Contains the list of widget ids that have been deleted from the dashboard
  // We store this to prevent updates on main dashboards to recreate widgets
  // that have been deleted from the templates
  deletedWidgets?: string[];
  showFilter?: boolean;
  buttons?: Button[];
  archived: boolean;
  archivedAt?: Date;
  gridOptions?: any;
  filter?: Filter;
  defaultTemplate?: boolean;
}

/** Mongoose button schema declaration */
const buttonSchema = new Schema<Button>(
  {
    text: String,
    href: String,
    hasRoleRestriction: Boolean,
    roles: Array<string>,
    variant: String,
    category: String,
    openInNewTab: Boolean,
  },
  { _id: false }
);

/** Mongoose filter schema declaration */
const filterSchema = new Schema<Filter>(
  {
    variant: String,
    show: Boolean,
    closable: Boolean,
    structure: mongoose.Schema.Types.Mixed,
    position: String,
  },
  { _id: false }
);

/** Mongoose dashboard schema declaration */
const dashboardSchema = new Schema<Dashboard>(
  {
    name: String,
    structure: mongoose.Schema.Types.Mixed,
    deletedWidgets: [String],
    showFilter: Boolean,
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
    filter: filterSchema,
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
