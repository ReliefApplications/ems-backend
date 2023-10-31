import mongoose from 'mongoose';
import { getDateForMongo } from '@utils/filter/getDateForMongo';
import { getTimeForMongo } from '@utils/filter/getTimeForMongo';

/** The default fields */
const DEFAULT_FIELDS = [
  {
    name: 'id',
    type: 'text',
  },
  {
    name: 'createdAt',
    type: 'date',
  },
  {
    name: 'modifiedAt',
    type: 'date',
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
  context: any,
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

      if (resourceField?.resource) {
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
        $in: ['$_id', filter.value.map((x) => new mongoose.Types.ObjectId(x))],
      };
    }

    // Filter on forms, using form id
    if (['form', 'lastUpdateForm'].includes(filter.field)) {
      if (mongoose.isValidObjectId(filter.value)) {
        filter.value = new mongoose.Types.ObjectId(filter.value);
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
        // Logic is: _resource_name.data.field, if not default field, else _resource_name.field
        if (FLAT_DEFAULT_FIELDS.includes(filter.field.split('.')[1])) {
          fieldName = `_${filter.field.split('.')[0]}.${
            filter.field.split('.')[1]
          }`;
          type = DEFAULT_FIELDS.find(
            (x) => x.name === filter.field.split('.')[1]
          ).type;
        } else {
          fieldName = `_${filter.field.split('.')[0]}.data.${
            filter.field.split('.')[1]
          }`;
        }
      }
    }

    fieldName = `$${fieldName}`;

    const value = isAttributeFilter ? attrValue : filter.value;
    const getSimpleFilter = (v: any) => {
      const numberValue = Number(v);
      switch (filter.operator) {
        case 'isnull':
          return { $eq: [fieldName, null] };
        case 'isnotnull':
          return { $ne: [fieldName, null] };
        case 'startswith':
          return {
            $regexMatch: { input: fieldName, regex: `^${v}`, options: 'i' },
          };
        case 'endswith':
          return {
            $regexMatch: { input: fieldName, regex: `${v}$`, options: 'i' },
          };
        case 'in':
        case 'contains':
          return { $regexMatch: { input: fieldName, regex: v, options: 'i' } };
        case 'notin':
        case 'doesnotcontain':
          return {
            $not: {
              $regexMatch: { input: fieldName, regex: v, options: 'i' },
            },
          };
        case 'isempty':
          return { $eq: [fieldName, ''] };
        case 'isnotempty':
          return { $ne: [fieldName, ''] };

        // Looks like this is not used anywhere, so commenting out for now
        // removing the comment won't work, if needed, we need to update to be usable
        // inside a $expr
        // case 'near': {
        //   return {
        //     [fieldName]: {
        //       $near: {
        //         $geometry: {
        //           type: 'Point',
        //           coordinates: value.geometry,
        //         },
        //         $maxDistance: value.distance,
        //       },
        //     },
        //   };
        // }
        //
        // case 'notnear': {
        //   return {
        //     [fieldName]: {
        //       $near: {
        //         $geometry: {
        //           type: 'Point',
        //           coordinates: value.geometry,
        //         },
        //         $minDistance: value.distance,
        //       },
        //     },
        //   };
        // }
        // case 'intersects': {
        //   return {
        //     [fieldName]: {
        //       $geoIntersects: {
        //         $geometry: {
        //           type: 'Polygon',
        //           coordinates: value.geometry,
        //         },
        //       },
        //     },
        //   };
        // }
        // case 'notintersects': {
        //   return {
        //     [fieldName]: {
        //       $not: {
        //         $geoIntersects: {
        //           $geometry: {
        //             type: 'Polygon',
        //             coordinates: value.geometry,
        //           },
        //         },
        //       },
        //     },
        //   };
        // }

        // All other operators share the same logic (eq, neq, lt, lte, gt, gte)
        default: {
          const mappedOperator = SIMPLE_OPERATORS_MAP[filter.operator];
          if (!mappedOperator) {
            return {};
          }

          // Special cases for default fields
          if (fieldName.startsWith('$_')) {
            return {
              $or: [
                { [mappedOperator]: [fieldName, v] },
                { [mappedOperator]: [`$${fieldName.slice(2)}`, v] },
                {
                  [mappedOperator]: [
                    `$${fieldName.slice(2)}`.replace('.data.', '.'),
                    v,
                  ],
                },
              ],
            };
          }

          // If a number, also check for string values
          if (!isNaN(numberValue)) {
            return {
              $or: [
                { [mappedOperator]: [fieldName, String(v)] },
                { [mappedOperator]: [fieldName, numberValue] },
              ],
            };
          }

          return { [mappedOperator]: [fieldName, v] };
        }
      }
    };

    const getFilterForArrays = (v: any[]) => {
      if (!Array.isArray(v)) {
        v = [v];
      }

      switch (filter.operator) {
        case 'isnull':
          return { $eq: [fieldName, null] };
        case 'isnotnull':
          return { $ne: [fieldName, null] };
        case 'eq':
          return {
            $setEquals: [fieldName, v],
          };
        case 'neq':
          return {
            $not: {
              $setEquals: [fieldName, v],
            },
          };
        case 'contains':
          return {
            $setIsSubset: [
              v,
              {
                $cond: {
                  if: { $isArray: fieldName },
                  then: fieldName,
                  else: [],
                },
              },
            ],
          };
        case 'doesnotcontain':
          return {
            $cond: {
              if: {
                $size: {
                  $setIntersection: [
                    v,
                    {
                      $cond: {
                        if: { $isArray: fieldName },
                        then: fieldName,
                        else: [],
                      },
                    },
                  ],
                },
              },
              then: false,
              else: true,
            },
          };
        case 'isempty':
          return {
            $or: [
              { $eq: [fieldName, null] },
              { $eq: [{ $size: fieldName }, 0] },
            ],
          };
        case 'isnotempty':
          return {
            $and: [
              { $ne: [fieldName, null] },
              { $gt: [{ $size: fieldName }, 0] },
            ],
          };
      }
    };

    switch (type) {
      case 'date':
        // For the dates, we don't save the time
        if (!value.includes('T')) {
          return getSimpleFilter({
            $convert: { input: value, to: 'date', onError: null },
          });
        }
      // If not in the expected format, we go to the next case (no break)
      case 'datetime':
      case 'datetime-local':
        return getSimpleFilter(getDateForMongo(value));
      case 'time': {
        return getSimpleFilter(getTimeForMongo(value));
      }
      case 'users': {
        const meID = context?.user?._id.toString();
        return getFilterForArrays(
          value.map((x: string) => (x === 'me' ? meID : x))
        );
      }
      case 'owner':
      case 'checkbox':
      case 'tagbox':
        return getFilterForArrays(value);
      default:
        return getSimpleFilter(value);
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

  return { $expr: mongooseFilter };
};
