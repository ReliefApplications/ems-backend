import { Schema } from 'mongoose';

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
}

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
  },
  { _id: false }
);
