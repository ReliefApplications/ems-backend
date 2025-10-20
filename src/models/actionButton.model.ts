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
    autoReload?: boolean;
  };
  // Clone Record
  cloneRecord?: {
    template?: string;
    autoReload?: boolean;
  };
  // Add Record
  addRecord?: {
    resource?: string;
    template?: string;
    fieldsForUpdate?: Array<string>;
    autoReload?: boolean;
    mapping?: any;
  };
  // Notifications
  subscribeToNotification?: {
    notification?: string;
  };
  unsubscribeFromNotification?: {
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
    // Clone Record
    cloneRecord: {
      type: new Schema(
        {
          template: String,
          autoReload: Boolean,
          onSave: {
            type: new Schema(
              {
                navigateTo: {
                  type: new Schema(
                    {
                      targetUrl: {
                        type: new Schema(
                          {
                            href: String,
                            openInNewTab: { type: Boolean, default: true },
                          },
                          { _id: false }
                        ),
                        default: null,
                      },
                      targetPage: {
                        type: new Schema(
                          {
                            pageUrl: { type: String },
                            field: { type: String },
                          },
                          { _id: false }
                        ),
                        default: null,
                      },
                    },
                    { _id: false }
                  ),
                  default: null,
                },
              },
              { _id: false }
            ),
            default: null,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    // Edit Record
    editRecord: {
      type: new Schema(
        {
          template: String,
          autoReload: Boolean,
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
          autoReload: Boolean,
          fieldsForUpdate: { type: [String], default: [] },
          mapping: Schema.Types.Mixed,
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
    unsubscribeFromNotification: {
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
