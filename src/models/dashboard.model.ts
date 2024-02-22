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

/** Mongoose state interface declaration */
interface State {
  name: string;
  id: string;
}

/** Dashboard documents interface declaration */
export interface Dashboard extends Document {
  kind: 'Dashboard';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  showFilter?: boolean;
  states?: State[];
  buttons?: Button[];
  archived: boolean;
  archivedAt?: Date;
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

/** Mongoose state schema declaration */
const stateSchema = new Schema<State>(
  {
    name: String,
    id: String,
  },
  { _id: false }
);

/** Mongoose dashboard schema declaration */
const dashboardSchema = new Schema<Dashboard>(
  {
    name: String,
    structure: mongoose.Schema.Types.Mixed,
    showFilter: Boolean,
    states: [stateSchema],
    buttons: [buttonSchema],
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      expires: 2592000,
    },
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
