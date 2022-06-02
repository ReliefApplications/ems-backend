import { GraphQLError } from 'graphql';
import { Form, Resource, Record, User } from '../../../../models';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';
import { decodeCursor, encodeCursor } from '../../../../schema/types';
import { getFullChoices, sortByTextCallback } from '../../../../utils/form';
import getFilter from './getFilter';
import getUserFilter from './getUserFilter';
import getSortField from './getSortField';
import getSortOrder from './getSortOrder';
import getStyle from './getStyle';
import mongoose from 'mongoose';

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
 * @param id The id of the resource or form
 * @param data fields to fetch
 * @returns The resolver function
 */
export default (id, data) =>
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
    const ability: AppAbility = user.ability;
    // Filter from the query definition
    const mongooseFilter = getFilter(filter, data, context);
    // Additional filter on user objects such as CreatedBy or LastUpdatedBy
    // Must be applied after users lookups in the aggregation
    const userFilter = getUserFilter(filter, data, context);

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
        items = aggregation[0].items;
        totalCount = aggregation[0]?.totalCount[0]?.count || 0;
      } else {
        const aggregation = await Record.aggregate([
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
        items = aggregation[0].items;
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
        const styleFilter = getFilter(style.filter, data, context);
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
