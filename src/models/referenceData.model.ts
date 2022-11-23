import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { getGraphQLTypeName } from '@utils/validators';
import { referenceDataType } from '@const/enumTypes';

/** Reference data document interface. */
interface ReferenceDataDocument extends Document {
  kind: 'ReferenceData';
  name: string;
  graphQLTypeName: string;
  modifiedAt: Date;
  type: string;
  apiConfiguration: string;
  query: string;
  fields: string[];
  valueField: string;
  path: string;
  data: any;
  graphQLFilter: string;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
}

/** Interface of Reference Data */
export type ReferenceData = ReferenceDataDocument;

/** Interface of Reference data model */
export interface ReferenceDataModel
  extends AccessibleRecordModel<ReferenceData> {
  hasDuplicate(graphQLTypeName: string, id?: string): Promise<boolean>;
  getGraphQLTypeName(name: string): string;
}

/**
 * Reference data model.
 * Reference data are coming from external APIs.
 */
const schema = new Schema<ReferenceData>(
  {
    name: String,
    graphQLTypeName: String,
    type: {
      type: String,
      enum: Object.values(referenceDataType),
    },
    apiConfiguration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiConfiguration',
    },
    query: String,
    fields: [String],
    valueField: String,
    path: String,
    data: mongoose.Schema.Types.Mixed,
    graphQLFilter: String,
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
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' },
  }
);

// Get GraphQL type name of the form
schema.statics.getGraphQLTypeName = function (name: string): string {
  return getGraphQLTypeName(name + '_ref');
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

schema.index({ name: 1 }, { unique: true });
schema.index({ graphQLTypeName: 1 }, { unique: true });
schema.plugin(accessibleRecordsPlugin);

/** Mongoose reference data model definition */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const ReferenceData: ReferenceDataModel = mongoose.model<
  ReferenceData,
  ReferenceDataModel
>('ReferenceData', schema);
