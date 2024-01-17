import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import mongoose, { Schema, Document } from 'mongoose';
import { getGraphQLTypeName } from '@utils/validators';
import { referenceDataType } from '@const/enumTypes';
import { get, set, snakeCase } from 'lodash';
import { aggregationSchema } from './aggregation.model';

/**
 * Reference data transformer.
 * Convert data from reference data into graphQL data.
 */
export class DataTransformer {
  /** Reference data fields */
  fields: any[];

  /** Reference data raw data */
  data: any[];

  /**
   * Reference data transformer.
   * Convert data from reference data into graphQL data.
   *
   * @param fields Reference data fields
   * @param data Reference data raw data
   */
  constructor(fields, data) {
    this.fields = fields;
    this.data = data;
  }

  /**
   * Transform raw data into graphQL data
   *
   * @returns graphQL data
   */
  transformData() {
    return this.data.map((item) => {
      const transformedItem = {};

      this.fields.forEach((field) => {
        const { name, graphQLFieldName } = field;
        const value = get(item, name);

        set(transformedItem, graphQLFieldName, value);
      });

      return transformedItem;
    });
  }
}

/** Reference data document interface. */
interface ReferenceDataDocument extends Document {
  kind: 'ReferenceData';
  name: string;
  graphQLTypeName: string;
  modifiedAt: Date;
  type: string;
  apiConfiguration: mongoose.Types.ObjectId;
  query: string;
  fields: { name: string; type: string; graphQLFieldName: string }[];
  valueField: string;
  path: string;
  data: any;
  graphQLFilter: string;
  permissions?: {
    canSee?: any[];
    canUpdate?: any[];
    canDelete?: any[];
  };
  aggregations: any;

  // Pagination strategies
  //  offset: The client will send the offset (how many items to skip)
  //  cursor: The client will send the cursor of the last item
  //  page: The client will send the page number
  pageInfo?: {
    // JSON path that when queried to the API response will return the total number of items
    totalCountField?: string;
    // Name of the query variable that corresponds to the page size
    pageSizeVar?: string;
  } & (
    | {
        strategy: 'offset';
        // Name of the query variable to be used for determining the offset
        offsetVar: string;
      }
    | {
        strategy: 'cursor';
        // JSON path that when queried to the API response will return the cursor
        cursorField: string;
        // Name of the query variable to be used for determining the cursor
        cursorVar: string;
      }
    | {
        strategy: 'page';
        // Name of the query variable that corresponds to the page number
        pageVar: string;
      }
  );
}

/** Interface of Reference Data */
export type ReferenceData = ReferenceDataDocument;

/** Interface of Reference data model */
export interface ReferenceDataModel
  extends AccessibleRecordModel<ReferenceData> {
  hasDuplicate(graphQLTypeName: string, id?: string): Promise<boolean>;
  getGraphQLTypeName(name: string): string;
  getGraphQLFieldName(name: string): string;
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
    fields: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
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
    aggregations: [aggregationSchema],
    pageInfo: {
      strategy: {
        type: String,
        enum: ['offset', 'cursor', 'page'],
      },
      cursorField: String,
      cursorVar: String,
      offsetVar: String,
      pageVar: String,
      pageSizeVar: String,
      totalCountField: String,
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

schema.statics.getGraphQLFieldName = function (name: string): string {
  return snakeCase(name);
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
    }).then((doc: any) => res(!!doc));
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
