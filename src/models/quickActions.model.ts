import { Schema } from 'mongoose';

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
export const buttonSchema = new Schema<Button>(
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
