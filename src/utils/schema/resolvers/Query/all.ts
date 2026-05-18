import { GraphQLError, valueFromASTUntyped } from 'graphql';
import { Record, ReferenceData, User } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { encodeCursor } from '@schema/types';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter, {
  FLAT_DEFAULT_FIELDS,
  extractFilterFields,
} from './getFilter';
import getSearchFilter from './getSearchFilter';
import getStyle from './getStyle';
import getSortAggregation from './getSortAggregation';
import mongoose from 'mongoose';
import buildReferenceDataAggregation from '@utils/aggregation/buildReferenceDataAggregation';
import { getAccessibleFields } from '@utils/form';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { logger } from '@services/logger.service';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { flatten, get, isArray, set } from 'lodash';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import NodeCache from 'node-cache';
import { AppAbility } from '@security/defineUserAbility';
import { createCache } from '@utils/cache';

/** Default number for items to get */
const DEFAULT_FIRST = 25;

/** Ability Cache, based on user id, time to live: 5min */
const abilityCache = new NodeCache({ stdTTL: 60 * 5, checkperiod: 60 });

/**
 * Permission filters cache, keyed by user id. 5 min TTL.
 * Backed by Redis when configured (shared across instances), otherwise
 * by an in-process map. Values are plain mongo filter objects.
 */
const permissionFiltersCache = createCache('permissionFilters', 60 * 5);

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
                const value = valueFromASTUntyped(x.value);
                if (value !== undefined && value !== null) {
                  Object.assign(o, { [x.name.value]: value });
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
      sortField,
      sortOrder = 'asc',
      first = DEFAULT_FIRST,
      skip = 0,
      afterCursor,
      filter = {},
      display = false,
      styles = [],
      actions = [],
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
      const userId = user._id.toString();
      // Id of the form / resource
      const id = idsByName[entityName];
      // List of form / resource fields
      const fields: any[] = fieldsByName[entityName];

      // Pass display argument to children resolvers
      if (display) {
        context.display = true;
      }

      // === FILTERING ===
      const usedFields = extractFilterFields(filter);
      if (sortField) {
        usedFields.push(sortField);
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
              as: `_${resource}`,
            },
          },
          {
            $unwind: {
              path: `$_${resource}`,
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              [`_${resource}.id`]: { $toString: `$_${resource}._id` },
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
        if (queryFields.findIndex((x) => x.name === field.name) > -1)
          return true;

        // If sort field is a calculated field
        if (sortField === field.name) return true;

        const isUsedInFilter = (qFilter: any) => {
          if (qFilter.field) return qFilter.field === field.name;
          return qFilter.filters?.some((f) => isUsedInFilter(f)) ?? false;
        };

        // Check if the field is used in the filter
        if (isUsedInFilter(filter)) return true;

        // Check if the field is used in any styles' filters
        if (styles?.some((s) => isUsedInFilter(s.filter))) return true;

        // Check if the field is used in any actions' filters
        if (actions?.some((a) => isUsedInFilter(a.filter))) return true;

        // If not used in any of the above, don't add it to the pipeline
        return false;
      };

      const calculatedFieldService = new CalculatedFieldService(
        { fields, name: entityName },
        context,
        context.timeZone,
        context.user?.attributes || {}
      );
      for (const f of fields.filter(
        (x) => x.isCalculated && shouldAddCalculatedFieldToPipeline(x)
      )) {
        calculatedFieldsAggregation.push(
          ...(await calculatedFieldService.build(f.expression, f.name))
        );
      }

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
        archived: { $not: { $eq: true } },
      };

      // Additional filter from the user permissions
      let permissionFilters;
      // Try to get ability from cache
      let ability = abilityCache.get<AppAbility>(userId);
      if (!ability) {
        // If not available, build ability
        ability = await extendAbilityForRecords(user);
        abilityCache.set(userId, ability);
      }
      set(context, 'user.ability', ability);
      // Try to get permission filters from cache (Redis or memory)
      permissionFilters = await permissionFiltersCache.get<any>(userId);
      if (!permissionFilters) {
        permissionFilters = Record.find(
          accessibleBy(ability, 'read').Record
        ).getFilter();
        await permissionFiltersCache.set(userId, permissionFilters);
      }

      // Finally putting all filters together
      const filters = {
        $and: [mongooseFilter, permissionFilters],
      };

      const searchFilter = getSearchFilter(filter, fields, context);

      // === RUN AGGREGATION TO FETCH ITEMS ===
      let items: Record[] = [];
      let totalCount = 0;

      // If we're using skip parameter, include them into the aggregation
      if (skip || skip === 0) {
        const sort = await getSortAggregation(
          sortField,
          sortOrder,
          fields,
          context
        );
        const pipeline = [
          ...(searchFilter ? [searchFilter] : []),
          { $match: basicFilters },
          ...(at ? getAtAggregation(new Date(at)) : []),
          ...linkedRecordsAggregation,
          ...linkedReferenceDataAggregation,
          ...defaultRecordAggregation,
          ...calculatedFieldsAggregation,
          { $match: filters },
        ];
        const aggregation = await Record.aggregate(pipeline).facet({
          items: [
            ...projectAggregation,
            ...sort,
            { $skip: skip },
            { $limit: first + 1 },
          ],
          totalCount: [
            {
              $count: 'count',
            },
          ],
        });
        items = aggregation[0].items;
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      }
      // Note: the cursor-based pagination branch was removed: it was deprecated,
      // dead (read `aggregation[0].items` from a facet aliased `results`) and
      // unreachable since callers always provide a `skip` value (defaults to 0).

      // When a sub-selection passes a `filter` argument, we cannot satisfy it
      // from the bulk pre-fetch below (it groups records by id only). Let the
      // field's own resolver handle those by skipping the optimization.
      const hasSubFilter = (queryField: any) =>
        queryField?.arguments?.filter &&
        Object.keys(queryField.arguments.filter).length > 0;

      // Deal with resource/resources questions on THIS form
      const resourcesFields: any[] = fields.reduce((arr, field) => {
        if (field.type === 'resource' || field.type === 'resources') {
          const queryField = queryFields.find((x) => x.name === field.name);
          if (queryField && !hasSubFilter(queryField)) {
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
      const relatedQueryFieldsCount = queryFields.filter(
        (x) => x.fields && !hasSubFilter(x)
      ).length;
      if (relatedQueryFieldsCount - resourcesFields.length) {
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
              if (queryField && !hasSubFilter(queryField)) {
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
          }
        }
        // Group related filters by (entityName, fieldName) so each related
        // field results in a single `$or` clause with `$in: [...itemIds]`
        // instead of one `$or` clause per item.
        const relatedFiltersByKey = new Map<
          string,
          { entityName: string; fieldName: string; itemIds: any[] }
        >();
        if (relatedFields.length > 0) {
          for (const item of items as any) {
            for (const field of relatedFields) {
              const key = `${field.entityName}::${field.name}`;
              let entry = relatedFiltersByKey.get(key);
              if (!entry) {
                entry = {
                  entityName: field.entityName,
                  fieldName: field.name,
                  itemIds: [],
                };
                relatedFiltersByKey.set(key, entry);
              }
              entry.itemIds.push(item.id);
            }
          }
        }
        const relatedFilters = Array.from(relatedFiltersByKey.values()).map(
          (entry) => ({
            $or: [
              { resource: idsByName[entry.entityName] },
              { form: idsByName[entry.entityName] },
            ],
            [`data.${entry.fieldName}`]: { $in: entry.itemIds },
          })
        );
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
        ).lean();
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
        const objectIds = recordsIds.map((x) => new mongoose.Types.ObjectId(x));
        // Run style filters in parallel
        const styleResults = await Promise.all(
          styles.map((style) => {
            const styleFilter = getFilter(style.filter, fields, context);
            return Record.aggregate([
              {
                $match: {
                  _id: { $in: objectIds },
                },
              },
              ...calculatedFieldsAggregation,
              {
                $match: styleFilter,
              },
              { $addFields: { id: '$_id' } },
            ]);
          })
        );
        styles.forEach((style, idx) => {
          styleRules.push({ items: styleResults[idx], style });
        });
      }

      // === ACTIONS ===
      const actionRules: { items: any[]; action: any }[] = [];
      // If there is a custom action rule
      if (actions?.length > 0) {
        // Create the filter for each action
        const recordsIds = items.map((x) => x.id || x._id);
        const objectIds = recordsIds.map((x) => new mongoose.Types.ObjectId(x));
        // Run action filters in parallel
        const actionResults = await Promise.all(
          actions.map((action) => {
            const actionFilter = getFilter(action.filter, fields, context);
            return Record.aggregate([
              {
                $match: {
                  _id: { $in: objectIds },
                },
              },
              ...calculatedFieldsAggregation,
              {
                $match: actionFilter,
              },
              { $addFields: { id: '$_id' } },
            ]);
          })
        );
        actions.forEach((action, idx) => {
          actionRules.push({ items: actionResults[idx], action });
        });
      }

      // === CONSTRUCT OUTPUT + RETURN ===
      const edges = items.map((r) => {
        const record = getAccessibleFields(r, ability);
        Object.assign(record, { id: record._id });

        return {
          cursor: encodeCursor(record.id.toString()),
          node: display ? Object.assign(record, { display, fields }) : record,
          meta: {
            actions: actionRules
              .filter((a) => a.items.some((i) => i.id.equals(record.id)))
              .map((a) => a.action),
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
