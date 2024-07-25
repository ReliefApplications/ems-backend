import mongoose, { Types } from 'mongoose';
import { getDateForMongo } from '@utils/filter/getDateForMongo';
import { getTimeForMongo } from '@utils/filter/getTimeForMongo';
import { Context } from '@server/apollo/context';

/** The default fields */
const DEFAULT_FIELDS = [
  {
    name: 'id',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'datetime',
  },
  {
    name: 'modifiedAt',
    type: 'datetime',
  },
  {
    name: 'incrementalId',
    type: 'text',
  },
  {
    name: 'form',
    type: 'text',
  },
  {
    name: 'lastUpdateForm',
    type: 'text',
  },
  {
    name: 'archived',
    type: 'boolean',
  },
];

/** Maps oort simple operators to their mongo counterparts */
const SIMPLE_OPERATORS_MAP = {
  eq: '$eq',
  neq: '$ne',
  gte: '$gte',
  gt: '$gt',
  lte: '$lte',
  lt: '$lt',
};

/** Names of the default fields */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FLAT_DEFAULT_FIELDS = DEFAULT_FIELDS.map((x) => x.name);

/**
 * Fill passed array with fields used in filters
 *
 * @param filter filter to use for extraction
 * @returns array of used fields
 */
export const extractFilterFields = (filter: any): string[] => {
  let fields = [];
  if (filter.filters) {
    for (const subFilter of filter.filters) {
      fields = fields.concat(extractFilterFields(subFilter));
    }
  } else {
    if (filter.field) {
      fields.push(filter.field);
    }
  }
  return fields;
};

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of structure fields
 * @param context request context
 * @param prefix prefix to access field
 * @returns Mongo filter.
 */
const buildMongoFilter = (
  filter: any,
  fields: any[],
  context: Context,
  prefix = ''
): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) => buildMongoFilter(x, fields, context, prefix))
      .filter((x) => x);
    if (filters.length > 0) {
      switch (filter.logic) {
        case 'and': {
          return { $and: filters };
        }
        case 'or': {
          return { $or: filters };
        }
        default: {
          return {};
        }
      }
    } else {
      return {};
    }
  } else {
    if (!filter.field) {
      return;
    }
    // Get field name from filter field
    let fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field)
      ? filter.field
      : `${prefix}${filter.field}`;
    // Get type of field from filter field
    let type: string =
      fields.find(
        (x) => x.name === filter.field || x.name === filter.field.split('.')[0]
      )?.type || '';

    // If type is resource and refers to a nested field, get the type of the nested field
    if (type === 'resource' && context.resourceFieldsById) {
      const resourceField = fields.find(
        (x) => x.name === filter.field.split('.')[0]
      );

      if (filter.field.split('.')[1] === 'id') {
        // The id, unlike the _id, is a string
        type = 'text';
      } else if (resourceField?.resource) {
        // find the nested field
        const nestedField = context.resourceFieldsById[
          resourceField.resource
        ]?.find((x) => x.name === filter.field.split('.')[1]);
        // get the type of the nested field
        type = nestedField?.type || type;
      }
    }

    // If trying to filter ids, currently we disregard the operator and use $in
    if (filter.field === 'ids') {
      return {
        _id: { $in: filter.value.map((x) => new Types.ObjectId(x)) },
      };
    }

    // Special filter on id, to be used in context filters
    if (filter.field.endsWith('__ID__')) {
      const toMatch = filter.field.replace('__ID__', '_id');
      switch (filter.operator) {
        case 'eq':
          return { [toMatch]: new Types.ObjectId(filter.value) };
        case 'neq':
          return { [toMatch]: { $ne: new Types.ObjectId(filter.value) } };
        default:
        case 'in':
          return {
            [toMatch]: { $in: filter.value.map((x) => new Types.ObjectId(x)) },
          };
        case 'nin':
          return {
            [toMatch]: { $nin: filter.value.map((x) => new Types.ObjectId(x)) },
          };
          return {};
      }
    }

    // Filter on forms, using form id
    if (['form', 'lastUpdateForm'].includes(filter.field)) {
      if (mongoose.isValidObjectId(filter.value)) {
        filter.value = new Types.ObjectId(filter.value);
        fieldName = `_${filter.field}._id`;
      } else {
        fieldName = `_${filter.field}.name`;
      }
    }

    // Filter on user attribute
    if (['createdBy', 'lastUpdatedBy'].includes(filter.field.split('.')[0])) {
      const [field, subField] = filter.field.split('.');
      fieldName = `_${field}.user.${subField}`;
    }

    // Filter by user attribute
    const isAttributeFilter = filter.field.startsWith('$attribute.');
    const attrValue = isAttributeFilter
      ? context.user.attributes?.[filter.field.split('.')[1]]
      : '';
    if (isAttributeFilter) {
      fieldName = FLAT_DEFAULT_FIELDS.includes(filter.value)
        ? filter.value
        : `${prefix}${filter.value}`;
    }

    if (!filter.operator) {
      return;
    }

    // Check linked resources
    // Doesn't take into consideration deep objects like users or resources or reference data, but allows resource
    if (
      !isAttributeFilter &&
      filter.field.includes('.') &&
      !fields.find(
        (x) => x.name === filter.field.split('.')[0] && x.referenceData?.id
      )
    ) {
      if (
        !fields.find(
          (x) => x.name === filter.field.split('.')[0] && x.type === 'resource'
        )
      ) {
        // Prevent createdBy / lastUpdatedBy to return, as they should be in the filter
        if (
          !['createdBy', 'lastUpdatedBy'].includes(filter.field.split('.')[0])
        ) {
          return;
        }
      } else {
        // Recreate the field name in order to match with aggregation
        // Logic is: _resource_name.data.field, if not default field, else resource_name.field
        if (FLAT_DEFAULT_FIELDS.includes(filter.field.split('.')[1])) {
          fieldName = `_${filter.field.split('.')[0]}.${
            filter.field.split('.')[1]
          }`;
          type = DEFAULT_FIELDS.find(
            (x) => x.name === filter.field.split('.')[1]
          ).type;
        } else {
          fieldName = `${filter.field.split('.')[0]}.${
            filter.field.split('.')[1]
          }`;
        }
      }
    }

    const getSimpleFilter = (v: any) => {
      const numberValue = Number(v);
      switch (filter.operator) {
        case 'isnull':
          return {
            $or: [
              { [fieldName]: { $exists: false } },
              { [fieldName]: { $eq: null } },
            ],
          };
        case 'isnotnull':
          return { [fieldName]: { $exists: true, $ne: null } };
        case 'startswith':
          return { [fieldName]: { $regex: '^' + v, $options: 'i' } };
        case 'endswith':
          return { [fieldName]: { $regex: v + '$', $options: 'i' } };
        case 'in':
        case 'contains':
          return { [fieldName]: { $regex: v, $options: 'i' } };
        case 'notin':
        case 'doesnotcontain':
          return {
            [fieldName]: { $not: { $regex: v, $options: 'i' } },
          };
        case 'isempty':
          return { [fieldName]: { $exists: true, $eq: '' } };
        case 'isnotempty':
          return { [fieldName]: { $exists: true, $ne: '' } };
        case 'near': {
          return {
            [fieldName]: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: v.geometry,
                },
                $maxDistance: v.distance,
              },
            },
          };
        }
        case 'notnear': {
          return {
            [fieldName]: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: v.geometry,
                },
                $minDistance: v.distance,
              },
            },
          };
        }
        case 'intersects': {
          return {
            [fieldName]: {
              $geoIntersects: {
                $geometry: {
                  type: 'Polygon',
                  coordinates: v.geometry,
                },
              },
            },
          };
        }
        case 'notintersects': {
          return {
            [fieldName]: {
              $not: {
                $geoIntersects: {
                  $geometry: {
                    type: 'Polygon',
                    coordinates: v.geometry,
                  },
                },
              },
            },
          };
        }

        // All other operators share the same logic (eq, neq, lt, lte, gt, gte)
        default: {
          const mappedOperator = SIMPLE_OPERATORS_MAP[filter.operator];
          if (!mappedOperator) {
            return {};
          }

          // Special cases for default fields
          if (fieldName.startsWith('_')) {
            return {
              $or: [
                { [fieldName]: { [mappedOperator]: v } },
                { [fieldName.slice(1)]: { [mappedOperator]: v } },
                {
                  [fieldName.slice(1).replace('.data.', '.')]: {
                    [mappedOperator]: v,
                  },
                },
              ],
            };
          }

          // If a date, also check for string values
          if (v instanceof Date) {
            return !isNaN(v.getTime())
              ? {
                  $or: [
                    { [fieldName]: { [mappedOperator]: v } },
                    { [fieldName]: { [mappedOperator]: v.toISOString() } },
                  ],
                }
              : { [fieldName]: { [mappedOperator]: undefined } }; // If not a valid date, would always be false for the remaining operators
          }

          // If a number, also check for string values
          if (!isNaN(numberValue) && typeof v !== 'boolean' && v !== null) {
            return {
              $or: [
                { [fieldName]: { [mappedOperator]: String(v) } },
                { [fieldName]: { [mappedOperator]: numberValue } },
                { [fieldName]: { [mappedOperator]: v } },
              ],
            };
          }

          return { [fieldName]: { [mappedOperator]: v } };
        }
      }
    };

    const getFilterForArrays = (v: any[]) => {
      if (!Array.isArray(v)) {
        v = [v];
      }

      switch (filter.operator) {
        case 'isnull':
          return {
            $or: [
              { [fieldName]: { $exists: false } },
              { [fieldName]: { $eq: null } },
            ],
          };
        case 'isnotnull':
          return { [fieldName]: { $exists: true, $ne: null } };
        case 'eq':
          return { [fieldName]: { $size: v.length, $all: v } };
        case 'neq':
          return {
            [fieldName]: { $not: { $size: v.length, $all: v } },
          };
        case 'in':
        case 'intersects':
          return { [fieldName]: { $in: v } };
        case 'notin':
          return { [fieldName]: { $nin: v } };
        case 'isnotsubset':
          return { $not: { [fieldName]: { $all: v } } };
        case 'issubset':
        case 'contains':
          return { [fieldName]: { $all: v } };
        case 'doesnotcontain':
          return { [fieldName]: { $not: { $in: v } } };
        case 'isempty':
          return {
            $or: [
              { [fieldName]: { $exists: true, $size: 0 } },
              { [fieldName]: { $exists: false } },
              { [fieldName]: { $eq: null } },
            ],
          };
        case 'isnotempty':
          return { [fieldName]: { $exists: true, $ne: [] } };
      }
    };

    const value = isAttributeFilter ? attrValue : filter.value;
    switch (type) {
      case 'date':
      case 'datetime':
      case 'datetime-local':
        return getSimpleFilter(getDateForMongo(value));
      case 'time': {
        return getSimpleFilter(getTimeForMongo(value));
      }
      case 'users': {
        const meID = context?.user?._id.toString();
        return getFilterForArrays(
          (value ?? []).map((x: string) => (x === 'me' ? meID : x))
        );
      }
      case 'owner':
      case 'checkbox':
      case 'tagbox':
        return getFilterForArrays(value);
      case 'geospatial':
        return getSimpleFilter(value);
      default:
        if (Array.isArray(value)) {
          return getFilterForArrays(value);
        } else {
          return getSimpleFilter(value);
        }
    }
  }
};

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of structure fields
 * @param context request context
 * @param prefix prefix to access field
 * @returns Mongo filter.
 */
export default (
  filter: any,
  fields: any[],
  context?: any,
  prefix = 'data.'
) => {
  const expandedFields = fields.concat(DEFAULT_FIELDS);
  const mongooseFilter =
    buildMongoFilter(filter, expandedFields, context, prefix) ?? {};

  return mongooseFilter;
};
