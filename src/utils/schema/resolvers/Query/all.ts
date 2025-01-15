import { GraphQLError } from 'graphql';
import { Form, Record, ReferenceData, User } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { decodeCursor, encodeCursor } from '@schema/types';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter, {
  FLAT_DEFAULT_FIELDS,
  extractFilterFields,
} from './getFilter';
import getStyle from './getStyle';
import getSortAggregation from './getSortAggregation';
import mongoose from 'mongoose';
import buildReferenceDataAggregation from '@utils/aggregation/buildReferenceDataAggregation';
import { getAccessibleFields } from '@utils/form';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { logger } from '@lib/logger';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { flatten, get, isArray, set } from 'lodash';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

/** Default number for items to get */
const DEFAULT_FIRST = 25;

// todo: improve by only keeping used fields in the $project stage
/**
 * Project aggregation.
 * Reduce the volume of data to fetch
 */
const projectAggregation = [
  {
    $project: {
      id: 1,
      _id: 1,
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
      _createdBy: {
        user: {
          id: 1,
          _id: 1,
          name: 1,
          username: 1,
        },
      },
      modifiedAt: 1,
      _lastUpdatedBy: {
        user: {
          id: 1,
          _id: 1,
          name: 1,
          username: 1,
        },
      },
      data: 1,
    },
  },
];

/** Default aggregation common to all records to make lookups for default fields. */
const defaultRecordAggregation = [
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

/**
 * Build At aggregation, filtering out items created after this date, and using version that matches date
 *
 * @param at Date
 * @returns At aggregation
 */
const getAtAggregation = (at: Date) => {
  return [
    {
      $match: {
        createdAt: {
          $lte: at,
        },
      },
    },
    {
      $lookup: {
        from: 'versions',
        localField: 'versions',
        foreignField: '_id',
        pipeline: [
          {
            $match: {
              createdAt: {
                $lte: at,
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 1,
          },
        ],
        as: '__version',
      },
    },
    {
      $unwind: {
        path: '$__version',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        data: {
          $cond: {
            if: { $ifNull: ['$__version', false] },
            then: '$__version.data',
            else: '$data',
          },
        },
      },
    },
  ];
};

/**
 * Get queried fields from query definition
 *
 * @param info graphql query info
 * @returns queried fields
 */
const getQueryFields = (
  info: any
): {
  name: string;
  fields?: string[];
  arguments?: any;
}[] => {
  return (
    info.fieldNodes[0]?.selectionSet?.selections
      ?.find((x) => x.name.value === 'edges')
      ?.selectionSet?.selections?.find((x) => x.name.value === 'node')
      ?.selectionSet?.selections?.reduce(
        (arr, field) => [
          ...arr,
          {
            name: field.name.value,
            ...(field.selectionSet && {
              fields: field.selectionSet.selections.map((x) => x.name.value),
              arguments: field.arguments.reduce((o, x) => {
                if (x.value.value) {
                  Object.assign(o, { [x.name.value]: x.value.value });
                }
                return o;
              }, {}),
            }),
          },
        ],
        []
      ) || []
  );
};

/**
 * Sort in place passed records array if needed
 *
 * @param records Records array to be sorted
 * @param sortArgs Sort arguments
 */
const sortRecords = (records: any[], sortArgs: any): void => {
  if (sortArgs.sortField && sortArgs.sortOrder) {
    const sortField = FLAT_DEFAULT_FIELDS.includes(sortArgs.sortField)
      ? sortArgs.sortField
      : `data.${sortArgs.sortField}`;
    records.sort((a: any, b: any) => {
      if (get(a, sortField) === get(b, sortField)) return 0;
      if (sortArgs.sortOrder === 'asc') {
        return get(a, sortField) > get(b, sortField) ? 1 : -1;
      } else {
        return get(a, sortField) < get(b, sortField) ? 1 : -1;
      }
    });
  }
};

/**
 * Check if field is used as sort field
 *
 * @param sortFields array with all the sort fields and order
 * @param fieldName field to check
 * @returns true if field is used to sorting
 */
const isSortField = (sortFields: any[], fieldName: string): boolean =>
  sortFields?.includes((item: any) => item.field === fieldName);

/**
 * Returns a resolver that fetches records from resources/forms
 *
 * @param entityName Structure name
 * @param fieldsByName structure name / fields as key, value
 * @param idsByName structure name / id as key, value
 * @returns The resolver function
 */
export default (entityName: string, fieldsByName: any, idsByName: any) =>
  async (
    parent,
    {
      sort = [],
      first = DEFAULT_FIRST,
      skip = 0,
      afterCursor,
      filter = {},
      contextFilters = {},
      display = false,
      styles = [],
      at,
    },
    context,
    info
  ) => {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    checkPageSize(first);
    try {
      const user: User = context.user;
      // Id of the form / resource
      const id = idsByName[entityName];
      // List of form / resource fields
      const fields: any[] = fieldsByName[entityName];

      // Pass display argument to children resolvers
      if (display) {
        context.display = true;
      }

      filter = {
        logic: 'and',
        filters: [filter, contextFilters],
      } as any;
      // === FILTERING ===
      const usedFields = extractFilterFields(filter);
      if (sort && sort.length > 0) {
        sort.forEach((item: any) => {
          if (item.field) {
            usedFields.push(item.field);
          }
        });
      }

      // Get list of needed resources for the aggregation
      const resourcesToQuery = [
        ...new Set(usedFields.map((x) => x.split('.')[0])),
      ].filter((x) =>
        fields.find((f) => f.name === x && f.type === 'resource')
      );

      const resourceFieldsById = resourcesToQuery.reduce((o, x) => {
        const resourceId = fields.find((f) => f.name === x).resource;
        const resourceName = Object.keys(idsByName).find(
          (key) => idsByName[key] == resourceId
        );
        const resourceFields = fieldsByName[resourceName];
        return {
          ...o,
          [resourceId]: resourceFields,
        };
      }, {});

      context = { ...context, resourceFieldsById };

      let linkedRecordsAggregation = [];
      for (const resource of resourcesToQuery) {
        // Build linked records aggregations
        linkedRecordsAggregation = linkedRecordsAggregation.concat([
          {
            $addFields: {
              [`data.${resource}_id`]: {
                $convert: {
                  input: `$data.${resource}`,
                  to: 'objectId',
                  onError: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'records',
              localField: `data.${resource}_id`,
              foreignField: '_id',
              as: `${resource}`,
            },
          },
          {
            $unwind: {
              path: `$${resource}`,
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              [`${resource}.id`]: { $toString: `$${resource}._id` },
              [`${resource}.data.id`]: { $toString: `$${resource}._id` },
              [`${resource}.data._id`]: { $toString: `$${resource}._id` },
              [`${resource}.data.archived`]: `$${resource}.archived`,
            },
          },
          {
            $addFields: {
              [`${resource}`]: `$${resource}.data`,
            },
          },
        ]);

        // Build linked records filter
        const resourceId = fields.find((f) => f.name === resource).resource;
        const resourceName = Object.keys(idsByName).find(
          (key) => idsByName[key] == resourceId
        );
        const resourceFields = fieldsByName[resourceName];
        const usedResourceFields = usedFields
          .filter((x) => x.startsWith(`${resource}.`))
          .map((x) => x.split('.')[1]);
        resourceFields
          .filter((x) => usedResourceFields.includes(x.name))
          .map((x) =>
            fields.push({
              ...x,
              ...{ name: `${resource}.${x.name}` },
            })
          );
      }

      // Get list of reference data fields to query
      const referenceDataFieldsToQuery = fields.filter(
        (f) =>
          f.referenceData?.id &&
          [...new Set(usedFields.map((x) => x.split('.')[0]))].includes(f.name)
      );

      // Query needed reference datas
      const referenceDatas: ReferenceData[] = await ReferenceData.find({
        _id: referenceDataFieldsToQuery.map((f) => f.referenceData?.id),
      }).populate({
        path: 'apiConfiguration',
        model: 'ApiConfiguration',
        select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
      });

      // OPTIMIZATION: Does only one query to get all related question fields.
      // Check if we need to fetch any other record related to resource questions
      const queryFields = getQueryFields(info);

      // Build aggregation for calculated fields
      const calculatedFieldsAggregation: any[] = [];

      // only add calculated fields that are in the query
      // in order to decrease the pipeline size
      const shouldAddCalculatedFieldToPipeline = (field: any) => {
        // If field is requested in the query
        if (queryFields.findIndex((x) => x.name === field.name) > -1) {
          return true;
        }

        // If sort field is a calculated field
        if (isSortField(sort, field.name)) {
          return true;
        }

        const isUsedInFilter = (qFilter: any) => {
          if (qFilter.field) return qFilter.field === field.name;
          return qFilter?.filters?.some((f) => isUsedInFilter(f)) ?? false;
        };

        // Check if the field is used in the filter
        if (isUsedInFilter(filter)) {
          return true;
        }

        // Check if the field is used in any styles' filters
        if (styles?.some((s) => isUsedInFilter(s.filter))) {
          return true;
        }

        // If not used in any of the above, don't add it to the pipeline
        return false;
      };

      fields
        .filter((f) => f.isCalculated && shouldAddCalculatedFieldToPipeline(f))
        .forEach((f) =>
          calculatedFieldsAggregation.push(
            ...buildCalculatedFieldPipeline(
              f.expression,
              f.name,
              context.timeZone
            )
          )
        );

      // Build linked records aggregations
      const linkedReferenceDataAggregation = flatten(
        await Promise.all(
          referenceDataFieldsToQuery.map(async (field) => {
            const referenceData = referenceDatas.find(
              (x) => x.id === field.referenceData.id
            );
            return buildReferenceDataAggregation(referenceData, field, context);
          })
        )
      );

      // Filter from the query definition
      const mongooseFilter = getFilter(filter, fields, context);

      // Add the basic records filter
      const basicFilters = {
        $or: [{ resource: id }, { form: id }],
        archived: { $ne: true },
      };

      // Additional filter from the user permissions
      const form = await Form.findOne({
        $or: [{ _id: id }, { resource: id, core: true }],
      })
        .select('_id')
        .populate({
          path: 'resource',
          model: 'Resource',
          select: 'fields permissions',
        });
      const ability = await extendAbilityForRecords(user, form);
      set(context, 'user.ability', ability);
      const permissionFilters = Record.find(
        accessibleBy(ability, 'read').Record
      ).getFilter();

      // Finally putting all filters together
      const filters = {
        $and: [mongooseFilter, permissionFilters],
      };

      // === RUN AGGREGATION TO FETCH ITEMS ===
      let items: Record[] = [];
      let totalCount = 0;

      // If we're using skip parameter, include them into the aggregation
      if (skip || skip === 0) {
        const pipeline = [
          { $match: basicFilters },
          ...(at ? getAtAggregation(new Date(at)) : []),
          ...linkedRecordsAggregation,
          ...linkedReferenceDataAggregation,
          ...defaultRecordAggregation,
          ...calculatedFieldsAggregation,
          { $match: filters },
          ...projectAggregation,
          ...(await getSortAggregation(sort, fields, context)),
          {
            $facet: {
              items: [{ $skip: skip }, { $limit: first + 1 }],
              totalCount: [
                {
                  $count: 'count',
                },
              ],
            },
          },
        ];
        const aggregation = await Record.aggregate(pipeline);

        items = aggregation[0].items;
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      } else {
        // If we're using cursors, get pagination filters  <---- DEPRECATED ??
        const cursorFilters = afterCursor
          ? {
              _id: {
                $gt: decodeCursor(afterCursor),
              },
            }
          : {};
        const aggregation = await Record.aggregate([
          { $match: basicFilters },
          ...linkedRecordsAggregation,
          ...linkedReferenceDataAggregation,
          ...defaultRecordAggregation,
          ...(await getSortAggregation(sort, fields, context)),
          { $match: { $and: [filters, cursorFilters] } },
          {
            $facet: {
              results: [{ $limit: first + 1 }],
              totalCount: [
                {
                  $count: 'count',
                },
              ],
            },
          },
        ]);
        items = aggregation[0].items;
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      }

      // Deal with resource/resources questions on THIS form
      const resourcesFields: any[] = fields.reduce((arr, field) => {
        if (field.type === 'resource' || field.type === 'resources') {
          const queryField = queryFields.find((x) => x.name === field.name);
          if (queryField) {
            arr.push({
              ...field,
              fields: [
                ...queryField.fields,
                queryField.arguments?.sortField
                  ? queryField.arguments?.sortField
                  : '',
              ].filter((f) => f), // remove '' if in array
              arguments: queryField.arguments,
            });
          }
        }
        return arr;
      }, []);
      // Deal with resource/resources questions on OTHER forms if any
      let relatedFields = [];
      if (queryFields.filter((x) => x.fields).length - resourcesFields.length) {
        const entities = Object.keys(fieldsByName);
        const mappedRelatedFields = [];
        relatedFields = entities.reduce((arr, relatedEntityName) => {
          const reversedFields = getReversedFields(
            fieldsByName[relatedEntityName],
            id
          ).reduce((entityArr, x) => {
            if (!mappedRelatedFields.includes(x.relatedName)) {
              const queryField = queryFields.find(
                (y) => x.relatedName === y.name
              );
              if (queryField) {
                mappedRelatedFields.push(x.relatedName);
                entityArr.push({
                  ...x,
                  fields: [
                    ...queryField.fields,
                    x.name,
                    queryField.arguments?.sortField
                      ? queryField.arguments?.sortField
                      : '',
                  ].filter((f) => f), // remove '' if in array
                  arguments: queryField.arguments,
                  relatedEntityName,
                });
              }
            }
            return entityArr;
          }, []);
          if (reversedFields.length > 0) {
            arr = arr.concat(reversedFields);
          }
          return arr;
        }, []);
      }
      // If we need to do this optimization, mark each item to update
      if (resourcesFields.length > 0 || relatedFields.length > 0) {
        const itemsToUpdate: {
          item: any;
          field: any;
          record?: any;
          records?: any[];
        }[] = [];
        const relatedFilters = [];
        for (const item of items as any) {
          item._relatedRecords = {};
          item.data = item.data || {};
          for (const field of resourcesFields) {
            if (field.type === 'resource') {
              // If resource field is a calculated field, should use record _id and
              // not the calculated field saved in the field name
              const record =
                item.data[field.name + '_id'] ?? item.data[field.name];
              if (record) {
                itemsToUpdate.push({ item, record, field });
              }
            }
            if (field.type === 'resources') {
              const records = item.data[field.name];
              if (records && records.length > 0) {
                itemsToUpdate.push({ item, records, field });
              }
            }
          }
          for (const field of relatedFields) {
            itemsToUpdate.push({ item, field });
            relatedFilters.push({
              $or: [
                { resource: idsByName[field.entityName] },
                { form: idsByName[field.entityName] },
              ],
              [`data.${field.name}`]: item.id,
            });
          }
        }
        // Extract unique IDs
        const relatedIds = [
          ...new Set(
            itemsToUpdate.flatMap((x) => (x.record ? x.record : x.records))
          ),
        ];
        // Build projection to fetch minimum data
        const projection: string[] = ['createdBy', 'form'].concat(
          resourcesFields.concat(relatedFields).flatMap((x) =>
            x.fields.map((fieldName: string) => {
              if (FLAT_DEFAULT_FIELDS.includes(fieldName)) {
                return fieldName;
              }
              return `data.${fieldName}`;
            })
          )
        );
        // Fetch records
        const relatedRecords = await Record.find(
          {
            $or: [{ _id: { $in: relatedIds } }, ...relatedFilters],
            archived: { $ne: true },
          },
          projection
        );
        // Update items
        for (const item of itemsToUpdate) {
          if (item.record) {
            const record = relatedRecords.find((x) =>
              x._id.equals(item.record)
            );
            if (record) {
              item.item._relatedRecords[item.field.name] = record;
            }
          }
          if (item.records) {
            const records = relatedRecords.filter((x) =>
              item.records.some((y) => x._id.equals(y))
            );
            sortRecords(records, item.field.arguments);
            if (records) {
              item.item._relatedRecords[item.field.name] = records;
            }
          }
          if (item.field.entityName) {
            const records = relatedRecords.filter((x) => {
              const value = x.data[item.field.name];
              if (!value) return false;
              if (isArray(value)) {
                return value.includes(item.item.id);
              }
              return value === item.item.id;
            });
            sortRecords(records, item.field.arguments);
            if (records && records.length > 0) {
              item.item._relatedRecords[item.field.relatedName] = records;
            }
          }
        }
      }

      // Construct output object and return
      const hasNextPage = items.length > first;
      if (hasNextPage) {
        items = items.slice(0, items.length - 1);
      }

      // === STYLES ===
      const styleRules: { items: any[]; style: any }[] = [];
      // If there is a custom style rule
      if (styles?.length > 0) {
        // Create the filter for each style
        const recordsIds = items.map((x) => x.id || x._id);
        for (const style of styles) {
          const styleFilter = getFilter(style.filter, fields, context);
          // Get the records corresponding to the style filter
          const itemsToStyle = await Record.aggregate([
            {
              $match: {
                _id: {
                  $in: recordsIds.map((x) => new mongoose.Types.ObjectId(x)),
                },
              },
            },
            ...calculatedFieldsAggregation,
            { $match: styleFilter },
            { $addFields: { id: '$_id' } },
          ]);
          // Add the list of record and the corresponding style
          styleRules.push({ items: itemsToStyle, style: style });
        }
      }

      // === CONSTRUCT OUTPUT + RETURN ===
      const edges = items.map((r) => {
        const record = getAccessibleFields(r, ability);
        Object.assign(record, { id: record._id });

        return {
          cursor: encodeCursor(record.id.toString()),
          node: display ? Object.assign(record, { display, fields }) : record,
          meta: {
            style: getStyle(r, styleRules),
            raw: record.data,
          },
        };
      });
      return {
        pageInfo: {
          hasNextPage,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
        edges,
        totalCount,
        _source: id,
      };
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  };
