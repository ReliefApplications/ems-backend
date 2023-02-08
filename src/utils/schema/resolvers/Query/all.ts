import { GraphQLError } from 'graphql';
import { Form, Record, ReferenceData, User } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { decodeCursor, encodeCursor } from '@schema/types';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter, {
  FLAT_DEFAULT_FIELDS,
  extractFilterFields,
} from './getFilter';
import getAfterLookupsFilter from './getAfterLookupsFilter';
import getStyle from './getStyle';
import getSortAggregation from './getSortAggregation';
import mongoose from 'mongoose';
import buildReferenceDataAggregation from '@utils/aggregation/buildReferenceDataAggregation';
import { getAccessibleFields } from '@utils/form';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { flatten, get, isArray } from 'lodash';

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
    context,
    info
  ) => {
    const user: User = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
      .filter((f) => f.isCalculated)
      .forEach((f) =>
        calculatedFieldsAggregation.push(
          ...buildCalculatedFieldPipeline(f.expression, f.name)
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
    // Additional filter on objects such as CreatedBy, LastUpdatedBy or Form
    // Must be applied after lookups in the aggregation
    const afterLookupsFilters = getAfterLookupsFilter(filter, fields, context);

    // Add the basic records filter
    Object.assign(
      mongooseFilter,
      { $or: [{ resource: id }, { form: id }] },
      { archived: { $ne: true } }
    );

    // Additional filter from the user permissions
    const form = await Form.findOne({
      $or: [{ _id: id }, { resource: id, core: true }],
    })
      .select('_id permissions fields')
      .populate('resource');
    const ability = await extendAbilityForRecords(user, form);
    const permissionFilters = Record.accessibleBy(ability, 'read').getFilter();

    // Finally putting all filters together
    const filters = {
      $and: [mongooseFilter, permissionFilters, afterLookupsFilters],
    };

    // === RUN AGGREGATION TO FETCH ITEMS ===
    let items: Record[] = [];
    let totalCount = 0;

    // If we're using skip parameter, include them into the aggregation
    if (skip || skip === 0) {
      const aggregation = await Record.aggregate([
        ...linkedRecordsAggregation,
        ...linkedReferenceDataAggregation,
        ...defaultRecordAggregation,
        ...calculatedFieldsAggregation,
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

    // OPTIMIZATION: Does only one query to get all related question fields.
    // Check if we need to fetch any other record related to resource questions
    const queryFields = getQueryFields(info);

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
          ...calculatedFieldsAggregation,
          {
            $match: styleFilter,
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
