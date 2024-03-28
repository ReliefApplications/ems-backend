/* eslint-disable @typescript-eslint/dot-notation */
import { accessibleBy } from '@casl/mongoose';
import { Record, Resource } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { AppAbility } from '@security/defineUserAbility';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import { GraphQLError, GraphQLNonNull } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';
import getFilter, {
  extractFilterFields,
} from '../../utils/schema/resolvers/Query/getFilter';
import { DataSetType } from '@schema/types';

/** Arguments for the dataSet query */
type Args = {
  query: {
    resource: {
      id: string | Types.ObjectId;
      name: string;
    };
    name: string;
    filter: { logic: string; filters: any[] };
    pageSize: number;
    fields?: any[];
    sort?: {
      field: string;
      order: string;
    };
    style: any[];
    tabIndex: number;
  };
};
/** defaultRecordAggregation for the dataSet query */
export const defaultRecordAggregation = [
  { $addFields: { id: { $toString: '$_id' } } },
  {
    $addFields: {
      '_createdBy.user.id': { $toString: '$_createdBy.user._id' },
    },
  },
  {
    $addFields: {
      '_lastUpdatedBy.user.id': { $toString: '$_lastUpdatedBy.user._id' },
    },
  },
];
/** projectAggregation for the dataSet query */
export const projectAggregation = {
  $project: {
    id: 1,
    incrementalId: 1,
    _form: {
      _id: 1,
      name: 1,
    },
    _lastUpdateForm: {
      _id: 1,
      name: 1,
    },
    resource: 1,
    createdAt: 1,
    form: 1,
    lastUpdateForm: 1,
    modifiedAt: 1,
    data: 1,
    emailFields: 1,
  },
};

/** emailAggregation for the dataSet query */
export const emailAggregation = [
  {
    $addFields: {
      matchingFields: {
        $objectToArray: '$data',
      },
    },
  },
  {
    $addFields: {
      emailFields: {
        $filter: {
          input: '$matchingFields',
          as: 'field',
          cond: {
            $regexMatch: {
              input: {
                $convert: { input: '$$field.v', to: 'string', onError: '' },
              }, // Access the Value of the key-value pair
              regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              options: 'i',
            },
          },
        },
      },
    },
  },
];

/**
 * getting field name from field Set
 *
 * @param fieldSet
 * @returns fields name
 */
export const getFields = (fieldSet: any) => {
  const fields: string[] = [];
  const nestedField: any = {};
  fieldSet.forEach((obj: any) => {
    if (obj.type === 'resource') {
      fields.push(obj.name.split('.')[0]);
      const [mainField, subField] = obj.name.split('.');
      if (!nestedField[mainField]) {
        nestedField[mainField] = [];
      }

      if (subField) {
        nestedField[mainField].push({ [subField]: 1 });
        nestedField[mainField].push({ [`data.${subField}`]: 1 });
      }
    } else {
      fields.push(obj.name);
    }
  });
  return { fields: [...new Set(fields)], nestedField };
};

/**
 * @param value
 */

/**
 * Resolver to fetch the datasets using the resource Id, layout Id & dynamic filters
 *
 * @param DataSetArgs arguments object to build Query
 * @param context for authentication
 * @returns datasets
 */
export default {
  type: DataSetType,
  args: {
    query: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(_, args: Args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const query = args.query;
      const filterLogic = query?.filter ?? {};
      const limit = query?.pageSize ?? 10;
      const ability: AppAbility = context.user?.ability;
      const fieldsList = getFields(query?.fields ?? [])?.fields;
      const nestedFields = getFields(query?.fields ?? [])?.nestedField;
      const sortOrder = query?.sort?.order;
      const sortField = query?.sort?.field;
      const tabIndex = args.query.tabIndex;
      const resource = await Resource.findOne({
        _id: args.query.resource.id,
      });
      if (!resource) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const basicFilters = {
        $or: [{ resource: resource._id }, { form: resource._id }],
        archived: { $not: { $eq: true } },
      };
      const fields = resource?.fields;
      // === FILTERING ===
      const usedFields = extractFilterFields(filterLogic);
      if (sortField) {
        usedFields.push(sortField);
      }
      // Get list of needed resources for the aggregation
      const resourcesToQuery = [
        ...new Set(usedFields.map((x) => x.split('.')[0])),
      ].filter((x) =>
        fields.find((f) => f.name === x && f.type === 'resource')
      );
      let linkedRecordsAggregation = [];
      for (const res of resourcesToQuery) {
        // Build linked records aggregations
        linkedRecordsAggregation = linkedRecordsAggregation.concat([
          {
            $addFields: {
              [`data.${res}_id`]: {
                $convert: {
                  input: `$data.${res}`,
                  to: 'objectId',
                  onError: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'records',
              localField: `data.${res}_id`,
              foreignField: '_id',
              as: `_${res}`,
            },
          },
          {
            $unwind: {
              path: `$_${res}`,
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              [`_${res}.id`]: { $toString: `$_${res}._id` },
            },
          },
        ]);

        // Build linked records filter
        const resourceId = fields.find((f) => f.name === res).resource;
        const resourceQuery = await Resource.findOne({
          _id: resourceId,
        });
        const resourceFields = resourceQuery.fields;
        const usedResourceFields = usedFields
          .filter((x) => x.startsWith(`${res}.`))
          .map((x) => x.split('.')[1]);
        resourceFields
          .filter((x) => usedResourceFields.includes(x.name))
          .map((x) =>
            fields.push({
              ...x,
              ...{ name: `${res}.${x.name}` },
            })
          );
      }
      const abilityFilters = Record.find(
        accessibleBy(ability, 'read').Record
      )?.getFilter();
      const queryFilters = getFilter(filterLogic, fields, context);

      const projectFields: { [key: string]: number | string } = {};
      fieldsList.forEach((fieldData) => {
        if (
          fieldData.includes('createdAt') ||
          fieldData.includes('modifiedAt')
        ) {
          projectFields[fieldData] = `$${fieldData}`;
        } else if (
          fieldData.includes('createdBy') ||
          fieldData.includes('lastUpdatedBy')
        ) {
          const fieldName = fieldData.replaceAll('.', '_');
          projectFields[fieldName] = `$${fieldData}`;
        } else {
          projectFields[fieldData] = 1;
        }
      });

      const filters: any[] = [
        basicFilters,
        queryFilters,
        abilityFilters,
      ]?.filter((queryObj) => Boolean(Object.keys(queryObj)?.length));
      const aggregations: any[] = [
        ...defaultRecordAggregation,
        ...linkedRecordsAggregation,
        {
          $match: {
            $and: [...filters],
          },
        },

        sortField &&
          sortOrder && {
            $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
          },
        ...emailAggregation,
        Object.keys(projectFields).length
          ? {
              $project: {
                _id: 0,
                ...projectFields,
                data: { ...projectFields },
                emailFields: 1,
              },
            }
          : {
              ...projectAggregation,
            },
        limit && { $limit: limit },
      ].filter(Boolean);
      const records = await Record.aggregate(aggregations);
      if (!records) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const emailList = [];
      const dataList = [];
      for (const data of records) {
        const emails = data.emailFields;
        if (emails.length) {
          emails.forEach((obj: { [key: string]: string }) => {
            emailList.push(obj.v);
            data.email = obj.v;
          });
        }
        delete data.emailFields;
        dataList.push(data);
      }

      return {
        emails: emailList,
        records: dataList,
        totalCount: await Record.countDocuments({
          $and: [...filters],
        }),
        nestedFields: nestedFields,
        tabIndex: tabIndex,
      };
    } catch (error) {
      logger.error('Failed to resolve dataset', error.message, {
        stack: error.stack,
      });
      if (error instanceof GraphQLError) {
        throw new GraphQLError(error.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
