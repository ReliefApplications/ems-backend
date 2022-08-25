import { GraphQLError } from 'graphql';
import { Form, Record, User } from '../../../../models';
import extendAbilityForRecords from '../../../../security/extendAbilityForRecords';
import { decodeCursor, encodeCursor } from '../../../../schema/types';
import { getFullChoices, sortByTextCallback } from '../../../../utils/form';
import getFilter, { extractFilterFields } from './getFilter';
import getUserFilter from './getUserFilter';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getStyle from './getStyle';
import mongoose from 'mongoose';
import { pick } from 'lodash';

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
        localField: 'form',
        foreignField: '_id',
        as: '_form',
      },
    },
    {
      $unwind: '$_form',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy.user',
        foreignField: '_id',
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
        localField: 'lastVersion',
        foreignField: '_id',
        as: 'lastVersion',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastVersion.createdBy',
        foreignField: '_id',
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
        lastVersion: {
          $arrayElemAt: ['$versions', -1],
        },
      },
    },
    { $unset: 'lastVersion' },
    { $sort: { [`${getSortField(sortField)}`]: getSortOrder(sortOrder) } },
  ];
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
    },
    context
  ) => {
    const user: User = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    /** Id of the form / resource */
    const id = idsByName[entityName];
    /** List of form / resource fields */
    const fields = fieldsByName[entityName];

    // === FILTERING ===
    const usedFields = extractFilterFields(filter);
    if (sortField) {
      usedFields.push(sortField);
    }

    // Get list of needed resources for the aggregation
    const resourcesToQuery = [
      ...new Set(usedFields.map((x) => x.split('.')[0])),
    ].filter((x) => fields.find((f) => f.name === x && f.type === 'resource'));

    let linkedRecordsAggregation = [];
    for (const resource of resourcesToQuery) {
      // Build linked records aggregations
      linkedRecordsAggregation = linkedRecordsAggregation.concat([
        {
          $lookup: {
            from: 'records',
            let: { recordId: `$data.${resource}` },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', { $toObjectId: '$$recordId' }],
                  },
                },
              },
            ],
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

      // Build filter
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

    // Filter from the query definition
    const mongooseFilter = getFilter(filter, fields, context);
    // Additional filter on user objects such as CreatedBy or LastUpdatedBy
    // Must be applied after users lookups in the aggregation
    const userFilter = getUserFilter(filter, fields, context);

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

    let items: Record[] = [];
    let totalCount = 0;

    // Filter from the user permissions
    const form = await Form.findOne({
      $or: [{ _id: id }, { resource: id, core: true }],
    }).select('_id permissions fields');
    const ability = await extendAbilityForRecords(user, form);
    const permissionFilters = Record.accessibleBy(ability, 'read').getFilter();
    const filters = { $and: [mongooseFilter, permissionFilters] };
    const sortByField = fields.find((x) => x && x.name === sortField);

    // Check if we need to fetch choices to sort records
    if (sortByField && (sortByField.choices || sortByField.choicesByUrl)) {
      const promises: any[] = [
        Record.find(filters, ['_id', `data.${sortField}`]),
        getFullChoices(sortByField, context),
      ];
      const res = await Promise.all(promises);
      let partialItems = res[0].map(
        (item) =>
          new Record({
            ...item.toObject(),
            data: pick(item, item.accessibleFieldsBy(ability)).data,
          })
      ) as Record[];

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
          ...linkedRecordsAggregation,
          ...recordAggregation(sortField, sortOrder),
          { $match: { $and: [filters, userFilter] } },
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
        items = aggregation[0].items.map((x) => new Record(x));
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      } else {
        const aggregation = await Record.aggregate([
          ...linkedRecordsAggregation,
          ...recordAggregation(sortField, sortOrder),
          { $match: { $and: [filters, userFilter, cursorFilters] } },
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
        items = aggregation[0].items.map((x) => new Record(x));
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
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
      const ids = items.map((x) => x.id || x._id);
      for (const style of styles) {
        const styleFilter = getFilter(style.filter, fields, context);
        // Get the records corresponding to the style filter
        const itemsToStyle = await Record.aggregate([
          {
            $match: {
              $and: [
                { _id: { $in: ids.map((x) => mongoose.Types.ObjectId(x)) } },
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
    const edges = items.map((r) => {
      const record = new Record({
        ...r.toObject(),
        data: pick(r, r.accessibleFieldsBy(ability)).data,
      }).toObject();
      Object.assign(record, { id: record._id });

      return {
        cursor: encodeCursor(record.id.toString()),
        node: display ? Object.assign(record, { display, fields }) : record,
        meta: {
          style: getStyle(r, styleRules),
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
    };
  };
