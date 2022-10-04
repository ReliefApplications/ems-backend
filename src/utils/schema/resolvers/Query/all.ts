import { GraphQLError } from 'graphql';
import { Form, Record, ReferenceData, User } from '../../../../models';
import extendAbilityForRecords from '../../../../security/extendAbilityForRecords';
import { decodeCursor, encodeCursor } from '../../../../schema/types';
import getFilter, { extractFilterFields } from './getFilter';
import getUserFilter from './getUserFilter';
import getStyle from './getStyle';
import getSortAggregation from './getSortAggregation';
import mongoose from 'mongoose';
import buildReferenceDataAggregation from '../../../aggregation/buildReferenceDataAggregation';
import { getAccessibleFields } from '../../../../utils/form';
import buildCalculatedFieldPipeline from '../../../aggregation/buildCalculatedFieldPipeline';

/** Default number for items to get */
const DEFAULT_FIRST = 25;

/** Default aggregation common to all records to make lookups for default fields. */
const defaultRecordAggregation = [
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
];

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

    // Build aggregation for calculated fields
    const calculatedFieldsAggregation: any[] = [];
    fields
      .filter((f) => f.type === 'calculated')
      .forEach((f) =>
        calculatedFieldsAggregation.push(
          ...buildCalculatedFieldPipeline(f.expression, f.name)
        )
      );

    // Build linked records aggregations
    const linkedReferenceDataAggregation = await Promise.all(
      referenceDataFieldsToQuery.map(async (field) => {
        const referenceData = referenceDatas.find(
          (x) => x.id === field.referenceData.id
        );
        return buildReferenceDataAggregation(referenceData, field, context);
      })
    );

    // Filter from the query definition
    const mongooseFilter = getFilter(filter, fields, context);

    // Add the basic records filter
    Object.assign(
      mongooseFilter,
      { $or: [{ resource: id }, { form: id }] },
      { archived: { $ne: true } }
    );

    // Additional filter on user objects such as CreatedBy or LastUpdatedBy
    // Must be applied after users lookups in the aggregation
    const userFilter = getUserFilter(filter, fields, context);

    // Additional filter from the user permissions
    const form = await Form.findOne({
      $or: [{ _id: id }, { resource: id, core: true }],
    })
      .select('_id permissions fields')
      .populate('resource');
    const ability = await extendAbilityForRecords(user, form);
    const permissionFilters = Record.accessibleBy(ability, 'read').getFilter();

    // Finally putting all filters together
    const filters = { $and: [mongooseFilter, permissionFilters, userFilter] };

    // === RUN AGGREGATION TO FETCH ITEMS ===
    let items: Record[] = [];
    let totalCount = 0;

    // If we're using skip parameter, include them into the aggregation
    if (skip || skip === 0) {
      const aggregation = await Record.aggregate([
        ...calculatedFieldsAggregation,
        ...linkedRecordsAggregation,
        ...linkedReferenceDataAggregation,
        ...defaultRecordAggregation,
        ...(await getSortAggregation(sortField, sortOrder, fields, context)),
        { $match: filters },
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
      items = aggregation[0].items.map((x) => new Record(x)); // needed for accessible fields check
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
        ...linkedRecordsAggregation,
        ...linkedReferenceDataAggregation,
        ...defaultRecordAggregation,
        ...(await getSortAggregation(sortField, sortOrder, fields, context)),
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
      items = aggregation[0].items.map((x) => new Record(x)); // needed for accessible fields check
      totalCount = aggregation[0]?.totalCount[0]?.count || 0;
    }

    // Check if there is a next page and remove the extra item
    const hasNextPage = items.length > first;
    if (hasNextPage) {
      items = items.slice(0, items.length - 1);
    }

    // === STYLES ===
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

    // === CONSTRUCT OUTPUT + RETURN ===
    const edges = items.map((r) => {
      const record = getAccessibleFields(r, ability).toObject();
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
      _source: id,
    };
  };
