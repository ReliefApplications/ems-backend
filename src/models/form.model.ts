import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { status } from '@const/enumTypes';
import { Channel } from './channel.model';
import { layoutSchema } from './layout.model';
import { Version } from './version.model';
import { Record } from './record.model';
import { getGraphQLTypeName } from '@utils/validators';

/** Form documents interface declaration */
interface FormDocument extends Document {
  kind: 'Form';
  name?: string;
  graphQLTypeName?: string;
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

/** Interface of form */
export type Form = FormDocument;

/** Interface of form model */
export interface FormModel extends AccessibleRecordModel<Form> {
  hasDuplicate(graphQLTypeName: string, id?: string): Promise<boolean>;
  getGraphQLTypeName(name: string): string;
}

/** Mongoose form schema declaration */
const schema = new Schema<Form>(
  {
    name: String,
    graphQLTypeName: String,
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
          _id: false,
        },
      ],
      canUpdateRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
        },
      ],
      canDeleteRecords: [
        {
          role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
          },
          access: mongoose.Schema.Types.Mixed,
          _id: false,
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
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// Get GraphQL type name of the form
schema.statics.getGraphQLTypeName = function (name: string): string {
  return getGraphQLTypeName(name);
};

// Search for duplicate, using graphQL type name
schema.statics.hasDuplicate = function (
  graphQLTypeName: string,
  id?: string
): Promise<boolean> {
  return this.exists({
    graphQLTypeName,
    ...(id && { _id: { $ne: mongoose.Types.ObjectId(id) } }),
  });
};

// handle cascading deletion for forms
addOnBeforeDeleteMany(schema, async (forms) => {
  const versions = forms.reduce((acc, form) => acc.concat(form.versions), []);
  await Record.deleteMany({ form: { $in: forms } });
  await Channel.deleteMany({ form: { $in: forms } });
  await Version.deleteMany({ _id: { $in: versions } });
});

schema.index(
  { resource: 1 },
  { unique: true, partialFilterExpression: { core: true } }
);
schema.index({ graphQLTypeName: 1 }, { unique: true });
schema.plugin(accessibleRecordsPlugin);

/** Mongoose form model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Form: FormModel = mongoose.model<Form, FormModel>('Form', schema);
