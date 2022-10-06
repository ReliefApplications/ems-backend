import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Form, Resource, Record, User } from '../../../../models';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';
import { decodeCursor, encodeCursor } from '../../../../schema/types';
import { getFullChoices, sortByTextCallback } from '../../../../utils/form';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter, { FLAT_DEFAULT_FIELDS } from './getFilter';
import getAfterLookupsFilter from './getAfterLookupsFilter';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getStyle from './getStyle';
import mongoose from 'mongoose';
import { get, isArray } from 'lodash';

/** Default number for items to get */
const DEFAULT_FIRST = 25;

/**
 * Builds record aggregation.
 *
 * @param sortField Sort by field
 * @param sortOrder Sort order
 * @returns Record aggregation
 */
const recordAggregation = (sortField: string, sortOrder: string): any => {
  return [
    { $addFields: { id: { $toString: '$_id' } } },
    {
      $lookup: {
        from: 'forms',
        localField: 'form', // TODO: delete if let available, limitation of cosmosDB
        foreignField: '_id', // TODO: delete if let available, limitation of cosmosDB
        // let: {
        //   form: '$form',
        // },
        // pipeline: [
        //   {
        //     $match: {
        //       $expr: {
        //         $eq: ['$_id', '$$form'],
        //       },
        //     },
        //   },
        //   {
        //     $project: {
        //       _id: 1,
        //       name: 1,
        //       permissions: 1,
        //     },
        //   },
        // ],
        as: '_form',
      },
    },
    {
      $unwind: '$_form',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy.user', // TODO: delete if let available, limitation of cosmosDB
        foreignField: '_id', // TODO: delete if let available, limitation of cosmosDB
        // let: {
        //   user: '$createdBy.user',
        // },
        // pipeline: [
        //   {
        //     $match: {
        //       $expr: {
        //         $eq: ['$_id', '$$user'],
        //       },
        //     },
        //   },
        //   {
        //     $project: {
        //       _id: 1,
        //       name: 1,
        //       username: 1,
        //     },
        //   },
        // ],
        as: '_createdBy.user',
      },
    },
    {
      $unwind: {
        path: '$_createdBy.user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        '_createdBy.user.id': { $toString: '$_createdBy.user._id' },
        lastVersion: {
          $arrayElemAt: ['$versions', -1],
        },
      },
    },
    {
      $lookup: {
        from: 'versions',
        localField: 'lastVersion', // TODO: delete if let available, limitation of cosmosDB
        foreignField: '_id', // TODO: delete if let available, limitation of cosmosDB
        // let: {
        //   lastVersion: '$lastVersion',
        // },
        // pipeline: [
        //   {
        //     $match: {
        //       $expr: {
        //         $eq: ['$_id', '$$lastVersion'],
        //       },
        //     },
        //   },
        //   {
        //     $project: {
        //       createdBy: 1,
        //     },
        //   },
        // ],
        as: 'lastVersion',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastVersion.createdBy', // TODO: delete if let available, limitation of cosmosDB
        foreignField: '_id', // TODO: delete if let available, limitation of cosmosDB
        // let: {
        //   lastVersionUser: { $last: '$lastVersion.createdBy' },
        // },
        // pipeline: [
        //   {
        //     $match: {
        //       $expr: {
        //         $eq: ['$_id', '$$lastVersionUser'],
        //       },
        //     },
        //   },
        //   {
        //     $project: {
        //       _id: 1,
        //       name: 1,
        //       username: 1,
        //     },
        //   },
        // ],
        as: '_lastUpdatedBy',
      },
    },
    {
      $addFields: {
        _lastUpdatedBy: {
          $arrayElemAt: ['$_lastUpdatedBy', -1],
        },
      },
    },
    {
      $addFields: {
        '_lastUpdatedBy.user': {
          $ifNull: ['$_lastUpdatedBy', '$_createdBy.user'],
        },
      },
    },
    {
      $addFields: {
        '_lastUpdatedBy.user.id': { $toString: '$_lastUpdatedBy.user._id' },
      },
    },
    { $unset: 'lastVersion' },
    { $sort: { [`${getSortField(sortField)}`]: getSortOrder(sortOrder) } },
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
 * Returns a resolver that fetches records from resources/forms
 *
 * @param name The name of the resource or form
 * @param ids The ids of all structures
 * @param data Structures fields
 * @returns The resolver function
 */
export default (name, ids, data) =>
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
    },
    context,
    info
  ) => {
    const user: User = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;
    // Get the ID of the resource or form.
    const id = ids[name];
    // Filter from the query definition
    const mongooseFilter = getFilter(filter, data[name], context);
    // Additional filter on objects such as CreatedBy, LastUpdatedBy or Form
    // Must be applied after lookups in the aggregation
    const afterLookupsFilters = getAfterLookupsFilter(
      filter,
      data[name],
      context
    );

    Object.assign(
      mongooseFilter,
      { $or: [{ resource: id }, { form: id }] },
      { archived: { $ne: true } }
    );

    // PAGINATION
    const cursorFilters = afterCursor
      ? {
          _id: {
            $gt: decodeCursor(afterCursor),
          },
        }
      : {};

    // DISPLAY
    if (display) {
      context.display = true;
    }

    // Get fields if we want to display with text
    let fields: any[] = [];
    // Need to get the meta in order to populate the choices.
    if (display || sortField) {
      const form = await Form.findOne({ _id: id }).select('fields');
      const resource = await Resource.findOne({ _id: id }).select('fields');
      fields = form ? form.fields : resource.fields;
    }

    let items: Record[] = [];
    let totalCount = 0;
    let filters: any = {};
    // Filter from the user permissions
    let permissionFilters = [];
    if (ability.cannot('read', 'Record')) {
      const form = await Form.findOne({
        $or: [{ _id: id }, { resource: id, core: true }],
      }).select('permissions');
      permissionFilters = getFormPermissionFilter(user, form, 'canSeeRecords');
      if (permissionFilters.length > 0) {
        filters = { $and: [mongooseFilter, { $or: permissionFilters }] };
      } else {
        // If permissions are set up and no one match our role return null
        if (form.permissions.canSeeRecords.length > 0) {
          return {
            pageInfo: {
              hasNextPage: false,
              startCursor: null,
              endCursor: null,
            },
            edges: [],
            totalCount: 0,
          };
        } else {
          filters = mongooseFilter;
        }
      }
    } else {
      filters = mongooseFilter;
    }
    const sortByField = fields.find((x) => x && x.name === sortField);
    // OPTIMIZATION: Does only one query to get all related question fields.
    // Check if we need to fetch any other record related to resource questions
    const queryFields = getQueryFields(info);

    // Check if we need to fetch choices to sort records
    if (sortByField && (sortByField.choices || sortByField.choicesByUrl)) {
      const promises: any[] = [
        Record.find(filters, ['_id', `data.${sortField}`]),
        getFullChoices(sortByField, context),
      ];
      const res = await Promise.all(promises);
      let partialItems = res[0] as Record[];
      const choices = res[1] as any[];
      // Sort records using text value of the choices
      partialItems.sort(sortByTextCallback(choices, sortField, sortOrder));
      totalCount = partialItems.length;
      // Pagination
      if (skip || skip === 0) {
        partialItems = partialItems.slice(skip, skip + first);
      } else {
        // filters = mongooseFilter;
        partialItems = partialItems
          .filter((x) => x._id > decodeCursor(afterCursor))
          .slice(0, first);
      }
      // Fetch full records now that we know which ones we want
      const sortedIds = partialItems.map((x) => String(x._id));
      items = await Record.find({ _id: { $in: sortedIds } });
      items.sort(
        (itemA, itemB) =>
          sortedIds.indexOf(String(itemA._id)) -
          sortedIds.indexOf(String(itemB._id))
      );
    } else {
      // If we don't need choices to sort, use mongoose sort and pagination functions
      if (skip || skip === 0) {
        const aggregation = await Record.aggregate([
          { $match: filters },
          ...recordAggregation(sortField, sortOrder),
          { $match: afterLookupsFilters },
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
        ]);
        items = aggregation[0].items;
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      } else {
        const aggregation = await Record.aggregate([
          { $match: { $and: [filters, cursorFilters] } },
          ...recordAggregation(sortField, sortOrder),
          { $match: afterLookupsFilters },
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
    }

    // Deal with resource/resources questions on THIS form
    const resourcesFields: any[] = data[name].reduce((arr, field) => {
      if (field.type === 'resource' || field.type === 'resources') {
        const queryField = queryFields.find((x) => x.name === field.name);
        if (queryField) {
          arr.push({
            ...field,
            fields: queryField.fields,
            arguments: queryField.arguments,
          });
        }
      }
      return arr;
    }, []);
    // Deal with resource/resources questions on OTHER forms if any
    let relatedFields = [];
    if (queryFields.filter((x) => x.fields).length - resourcesFields.length) {
      const entities = Object.keys(data);
      const mappedRelatedFields = [];
      relatedFields = entities.reduce((arr, entityName) => {
        const reversedFields = getReversedFields(data[entityName], id).reduce(
          (entityArr, x) => {
            if (!mappedRelatedFields.includes(x.relatedName)) {
              const queryField = queryFields.find(
                (y) => x.relatedName === y.name
              );
              if (queryField) {
                mappedRelatedFields.push(x.relatedName);
                entityArr.push({
                  ...x,
                  fields: [...queryField.fields, x.name],
                  arguments: queryField.arguments,
                  entityName,
                });
              }
            }
            return entityArr;
          },
          []
        );
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
        for (const field of resourcesFields) {
          if (field.type === 'resource') {
            const record = item.data[field.name];
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
              { resource: ids[field.entityName] },
              { form: ids[field.entityName] },
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
          const record = relatedRecords.find((x) => x._id.equals(item.record));
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
    // Definition of styles
    const styleRules: { items: any[]; style: any }[] = [];
    // If there is a custom style rule
    if (styles?.length > 0) {
      // Create the filter for each style
      const recordsIds = items.map((x) => x.id || x._id);
      for (const style of styles) {
        const styleFilter = getFilter(style.filter, data[name], context);
        // Get the records corresponding to the style filter
        const itemsToStyle = await Record.aggregate([
          {
            $match: {
              $and: [
                {
                  _id: {
                    $in: recordsIds.map((x) => mongoose.Types.ObjectId(x)),
                  },
                },
                styleFilter,
              ],
            },
          },
          { $addFields: { id: '$_id' } },
        ]);
        // Add the list of record and the corresponding style
        styleRules.push({ items: itemsToStyle, style: style });
      }
    }
    const edges = items.map((r) => ({
      cursor: encodeCursor(r.id.toString()),
      node: display ? Object.assign(r, { display, fields }) : r,
      meta: {
        style: getStyle(r, styleRules),
      },
    }));
    return {
      pageInfo: {
        hasNextPage,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      edges,
      totalCount,
    };
  };
