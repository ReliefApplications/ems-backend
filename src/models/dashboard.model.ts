import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Document, Schema } from 'mongoose';

/** Field interface, for sendNotification action */
interface Field {
  format: any;
  name: string;
  type: string;
  kind: string;
  label: string;
  width: number;
  fields?: Array<Field>;
}

/** Mongoose button interface declaration */
export interface Button {
  text: string;
  // Display
  variant: string;
  category: string;
  // role restriction
  hasRoleRestriction: boolean;
  roles: string[];
  // Navigation
  href?: string;
  openInNewTab?: boolean;
  previousPage?: boolean;
  // Edit Record
  editRecord?: {
    template?: string;
  };
  // Add Record
  addRecord?: {
    resource?: string;
    template?: string;
    fieldsForUpdate?: Array<string>;
  };
  // Notifications
  subscribeToNotification?: {
    notification?: string;
  };
  sendNotification?: {
    distributionList?: string;
    templates?: Array<string>;
    fields?: Array<Field>;
  };
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
  showFilter?: boolean;
  buttons?: Button[];
  archived: boolean;
  archivedAt?: Date;
  gridOptions?: any;
  filter?: Filter;
  defaultTemplate?: boolean;
}

/** Send notification action field schema */
const sendNotificationFieldSchema = new Schema(
  {
    format: Schema.Types.Mixed,
    name: String,
    type: String,
    kind: String,
    label: String,
    width: Number,
    filter: Schema.Types.Mixed,
    sort: Schema.Types.Mixed,
    first: Number,
  },
  { _id: false }
);

// Add the recursive fields, after schema creation, otherwise, it may break
sendNotificationFieldSchema.add({
  fields: { type: [sendNotificationFieldSchema], default: [] },
});

/** Mongoose button schema declaration */
const buttonSchema = new Schema<Button>(
  {
    text: String,
    // Display
    variant: String,
    category: String,
    // Role restriction
    hasRoleRestriction: Boolean,
    roles: Array<string>,
    // Navigation
    href: String,
    openInNewTab: Boolean,
    previousPage: Boolean,
    // Edit Record
    editRecord: {
      type: new Schema(
        {
          template: String,
        },
        { _id: false }
      ),
      default: null,
    },
    // Add Record
    addRecord: {
      type: new Schema(
        {
          resource: String,
          template: String,
          fieldsForUpdate: { type: [String], default: [] },
        },
        { _id: false }
      ),
      default: null,
    },
    // Notifications
    subscribeToNotification: {
      type: new Schema(
        {
          notification: String,
        },
        { _id: false }
      ),
      default: null,
    },
    sendNotification: {
      type: new Schema(
        {
          distributionList: String,
          templates: { type: [String], default: [] },
          fields: {
            type: [sendNotificationFieldSchema],
            default: [],
          },
        },
        { _id: false }
      ),
      default: null,
    },
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
