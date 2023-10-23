import {
  accessibleFieldsPlugin,
  AccessibleRecordModel,
  accessibleRecordsPlugin,
  AccessibleFieldsModel,
  AccessibleFieldsDocument,
} from '@casl/mongoose';
import mongoose, { Schema } from 'mongoose';
import { User } from './user.model';
import { Form } from './form.model';

/** Draft record documents interface declaration */
// eslint-disable-next-line deprecation/deprecation
export interface DraftRecord extends AccessibleFieldsDocument {
  kind: 'DraftRecord';
  incrementalId: string;
  form: any;
  _form: Form;
  resource: any;
  createdAt: Date;
  modifiedAt: Date;
  data: any;
  versions: any;
  createdBy?: any;
  _createdBy?: User;
  _lastUpdatedBy?: User;
  lastUpdateForm?: any;
  _lastUpdateForm?: Form;
}

/** Mongoose record schema declaration */
const draftRecordSchema = new Schema<DraftRecord>(
  {
    incrementalId: {
      type: String,
      required: true,
    },
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
    },
    _form: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    lastUpdateForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
    },
    _lastUpdateForm: {
      type: mongoose.Schema.Types.Mixed,
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: false,
    },
    createdBy: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      roles: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Role',
      },
      positionAttributes: [
        {
          value: String,
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PositionAttributeCategory',
          },
        },
      ],
    },
    _createdBy: {
      type: mongoose.Schema.Types.Mixed,
    },
    _lastUpdatedBy: {
      type: mongoose.Schema.Types.Mixed,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    versions: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Version',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

draftRecordSchema.index(
  { incrementalId: 1, resource: 1 },
  { unique: true, partialFilterExpression: { resource: { $exists: true } } }
);
draftRecordSchema.index({ resource: 1 });
draftRecordSchema.index({ incrementalId: 1, form: 1 });
draftRecordSchema.plugin(accessibleRecordsPlugin);
draftRecordSchema.plugin(accessibleFieldsPlugin);

/** Mongoose draft record model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const DraftRecord = mongoose.model<
  DraftRecord,
  AccessibleFieldsModel<DraftRecord> & AccessibleRecordModel<DraftRecord>
>('DraftRecord', draftRecordSchema);
