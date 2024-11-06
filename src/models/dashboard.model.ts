import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Document, Schema } from 'mongoose';
import { Button, buttonSchema } from './quickActions.model';

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
  showFilter?: boolean;
  buttons?: Button[];
  archived: boolean;
  archivedAt?: Date;
  gridOptions?: any;
  filter?: Filter;
  defaultTemplate?: boolean;
}

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
