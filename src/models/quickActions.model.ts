import { Schema } from 'mongoose';

/** Mongoose button interface declaration */
export interface Button {
  text: string;
  hasRoleRestriction: boolean;
  roles: string[];
  variant: string;
  category: string;
  href?: string;
  openInNewTab?: boolean;
  previousPage?: boolean;
  resource?: string;
  template?: string;
  recordFields?: string[];
  notification?: string;
}

/** Mongoose button schema declaration */
export const buttonSchema = new Schema<Button>(
  {
    text: String,
    hasRoleRestriction: Boolean,
    roles: Array<string>,
    variant: String,
    category: String,
    href: String,
    openInNewTab: Boolean,
    previousPage: Boolean,
    resource: String,
    template: String,
    recordFields: Array<string>,
    notification: String,
  },
  { _id: false }
);
