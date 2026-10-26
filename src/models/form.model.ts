import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import { status } from '@const/enumTypes';
import { logger } from '@services/logger.service';
import { deleteFolder } from '@utils/files/deleteFolder';
import { addOnBeforeDeleteMany } from '@utils/models/deletion';
import { getGraphQLTypeName } from '@utils/validators';
import mongoose, { Document, Schema } from 'mongoose';
import { Channel } from './channel.model';
import { layoutSchema } from './layout.model';
import { Record, getRecordModel } from './record.model';
import { Version } from './version.model';
import { STORAGE_NAME_REGEX } from '@utils/models/storageConnection';
import { getErrorMessage } from '@utils/error';

/** Form documents interface declaration */
interface FormDocument extends Document {
  kind: 'Form';
  name?: string;
  graphQLTypeName?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  structure?: any;
  core?: boolean;
  isPublic?: boolean;
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
  /**
   * Name of the database holding the records and versions of the form, when
   * they must stay out of the main database. Set directly in the database by
   * administrators, never exposed to the front-end. The records of a resource
   * stay together: the setting of its core form applies to all its forms.
   */
  storage?: string;
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
    isPublic: {
      type: Boolean,
      default: false,
    },
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
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
    },
    storage: {
      type: String,
      match: STORAGE_NAME_REGEX,
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
  return new Promise((res) => {
    this.exists({
      graphQLTypeName,
      ...(id && { _id: { $ne: new mongoose.Types.ObjectId(id) } }),
    }).then((doc) => res(!!doc));
  });
};

// handle cascading deletion for forms
addOnBeforeDeleteMany(schema, async (forms) => {
  try {
    for (const form of forms) {
      await deleteFolder('forms', form.id);
      logger.info(`Files from form ${form.id} successfully removed.`);
    }

    const versions = forms.reduce((acc, form) => acc.concat(form.versions), []);
    // Records stored in storage databases, then the main database: the other
    // records, and the stubs of the stored ones
    const resourceIds = forms.map((form) => form.resource).filter((x) => x);
    const flagged: any[] = await mongoose
      .model('Form')
      .find({
        storage: { $exists: true, $nin: [null, ''] },
        $or: [
          { _id: { $in: forms.map((form) => form._id) } },
          ...(resourceIds.length ? [{ resource: { $in: resourceIds } }] : []),
        ],
      })
      .select('_id resource storage')
      .lean();
    for (const storage of new Set(flagged.map((x) => x.storage))) {
      const stored = flagged.filter((x) => x.storage === storage);
      await getRecordModel(storage).deleteMany({
        form: {
          $in: forms.filter(
            (form) =>
              stored.some((x) => x._id.equals(form._id)) ||
              stored.some(
                (x) => form.resource && x.resource?.equals(form.resource)
              )
          ),
        },
      });
    }
    await Record.deleteMany({ form: { $in: forms } });
    await Channel.deleteMany({ form: { $in: forms } });
    await Version.deleteMany({ _id: { $in: versions } });
  } catch (err) {
    logger.error(`Deletion of forms failed: ${getErrorMessage(err)}`);
  }
});

schema.index(
  { resource: 1 },
  { unique: true, partialFilterExpression: { core: true } }
);
schema.index({ graphQLTypeName: 1 }, { unique: true });
schema.index({ createdAt: 1 });

schema.plugin(accessibleRecordsPlugin);

/** Mongoose form model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Form: FormModel = mongoose.model<Form, FormModel>('Form', schema);
