import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '../utils/models/deletion';
import { status } from '../const/enumTypes';
import { Channel } from './channel';
import { layoutSchema } from './layout';
import { Version } from './version';
import { Record } from './record';

/** Form documents interface declaration */
export interface Form extends Document {
  kind: 'Form';
  name?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  core?: boolean;
  status?: string;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
    canCreateRecords?: any[];
    canSeeRecords?: any[];
    canUpdateRecords?: any[];
    canDeleteRecords?: any[];
    recordsUnicity?: any[];
  };
  fields?: any[];
  resource?: any;
  versions?: any[];
  channel?: any;
  layouts?: any;
}

/** Mongoose form schema declaration */
const formSchema = new Schema<Form>({
  name: String,
  createdAt: Date,
  modifiedAt: Date,
  structure: mongoose.Schema.Types.Mixed,
  core: Boolean,
  status: {
    type: String,
    enum: Object.values(status),
  },
  permissions: {
    canSee: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canUpdate: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canDelete: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canCreateRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    canSeeRecords: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        access: mongoose.Schema.Types.Mixed,
      },
    ],
    canUpdateRecords: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        access: mongoose.Schema.Types.Mixed,
      },
    ],
    canDeleteRecords: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        access: mongoose.Schema.Types.Mixed,
      },
    ],
    recordsUnicity: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
        },
        access: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  fields: {
    // name of field, id if external resource
    type: [mongoose.Schema.Types.Mixed],
  },
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
  },
  versions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Version',
  },
  channel: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Channel',
  },
  layouts: [layoutSchema],
});

// handle cascading deletion for forms
addOnBeforeDeleteMany(formSchema, async (forms) => {
  const versions = forms.reduce((acc, form) => acc.concat(form.versions), []);
  await Record.deleteMany({ form: { $in: forms } });
  await Channel.deleteMany({ form: { $in: forms } });
  await Version.deleteMany({ _id: { $in: versions } });
});

formSchema.index(
  { resource: 1 },
  { unique: true, partialFilterExpression: { core: true } }
);
formSchema.plugin(accessibleRecordsPlugin);

/** Mongoose form model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Form = mongoose.model<Form, AccessibleRecordModel<Form>>(
  'Form',
  formSchema
);
