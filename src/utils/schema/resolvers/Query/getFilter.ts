import mongoose from 'mongoose';
import { getDateForMongo } from '@utils/filter/getDateForMongo';
import { getTimeForMongo } from '@utils/filter/getTimeForMongo';
import {
  MULTISELECT_TYPES,
  DATE_TYPES,
  DATETIME_TYPES,
} from '@const/fieldTypes';
import { isNumber } from 'lodash';

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
];

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
    if (filter.field) {
      // Get field name from filter field
      let fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field)
        ? filter.field
        : `${prefix}${filter.field}`;
      // Get type of field from filter field
      let type: string =
        fields.find(
          (x) =>
            x.name === filter.field || x.name === filter.field.split('.')[0]
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
          ].find((x) => x.name === filter.field.split('.')[1]);
          // get the type of the nested field
          type = nestedField?.type || type;
        }
      }
      if (filter.field === 'ids') {
        return {
          _id: { $in: filter.value.map((x) => new mongoose.Types.ObjectId(x)) },
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

      const isAttributeFilter = filter.field.startsWith('$attribute.');
      const attrValue = isAttributeFilter
        ? context.user.attributes?.[filter.field.split('.')[1]]
        : '';
      if (isAttributeFilter)
        fieldName = FLAT_DEFAULT_FIELDS.includes(filter.value)
          ? filter.value
          : `${prefix}${filter.value}`;

      if (filter.operator) {
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
              (x) =>
                x.name === filter.field.split('.')[0] && x.type === 'resource'
            )
          ) {
            // Prevent createdBy / lastUpdatedBy to return, as they should be in the filter
            if (
              !['createdBy', 'lastUpdatedBy'].includes(
                filter.field.split('.')[0]
              )
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

        // In case type is multi-select and value is not an array, we treat as scalar
        // As it was probably unwinded in the aggregation
        if (
          MULTISELECT_TYPES.includes(type) &&
          filter.value &&
          !Array.isArray(filter.value)
        ) {
          type = 'text';
        }

        // const fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field) ? filter.field : `data.${filter.field}`;
        // const field = fields.find(x => x.name === filter.field);
        let value = filter.value;
        let intValue: number;
        let startDate: Date;
        let endDate: Date;
        let startDatetime: Date;
        let endDatetime: Date;
        let dateForFilter: any;
        switch (type) {
          case 'date':
            dateForFilter = getDateForMongo(value);
            // startDate represents the beginning of a day
            startDate = new Date(value);
            // endDate represents the last moment of the day after startDate
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1);
            endDate.setMilliseconds(-1);
            // you end up with a date range covering exactly the day selected
            value = dateForFilter.date;
            break;
          case 'datetime':
          case 'datetime-local':
            if (filter.operator !== 'inthelast') {
              // startDatetime contains the beginning of the minute
              startDatetime = getTimeForMongo(value);
              // endDatetime contains the end of the minute (last second, last ms)
              endDatetime = new Date(startDatetime.getTime() + 59999);
              // we end up with a date range covering exactly the minute selected,
              // regardless of the saved seconds and ms
            }
            break;
          case 'time': {
            value = getTimeForMongo(value);
            value = new Date(
              Date.UTC(1970, 0, 1, value.getHours(), value.getMinutes())
            );
            break;
          }
          case 'users': {
            if (context && context.user) {
              // handles the case where we want to filter by connected user
              value = value.map((x) =>
                x === 'me' ? context.user._id.toString() : x
              );
            }
            break;
          }
          case 'boolean': {
            // Avoid the int value to be set
            break;
          }
          default:
            try {
              intValue = Number(value);
              break;
            } catch {
              break;
            }
        }
        switch (filter.operator) {
          case 'eq': {
            // user attributes
            if (isAttributeFilter) {
              return { [fieldName]: attrValue };
            } else if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $size: value.length, $all: value } };
            } else if (DATETIME_TYPES.includes(type)) {
              return {
                [fieldName]: { $gte: startDatetime, $lte: endDatetime },
              };
            } else {
              if (DATE_TYPES.includes(type)) {
                return { [fieldName]: { $gte: startDate, $lte: endDate } };
              }
              if (isNaN(intValue)) {
                return { [fieldName]: { $eq: value } };
              } else {
                return {
                  $or: [
                    // Make sure that we compare both strings & numbers
                    { [fieldName]: { $eq: String(value) } },
                    { [fieldName]: { $eq: intValue } },
                  ],
                };
              }
            }
          }
          case 'neq': {
            // user attributes
            if (isAttributeFilter) {
              return { [fieldName]: { $ne: attrValue } };
            } else if (MULTISELECT_TYPES.includes(type)) {
              return {
                [fieldName]: { $not: { $size: value.length, $all: value } },
              };
            } else if (DATETIME_TYPES.includes(type)) {
              return {
                [fieldName]: {
                  $not: { $gte: startDatetime, $lte: endDatetime },
                },
              };
            } else if (DATE_TYPES.includes(type)) {
              return {
                [fieldName]: { $not: { $gte: startDate, $lte: endDate } },
              };
            } else {
              if (isNaN(intValue)) {
                return { [fieldName]: { $ne: value } };
              } else {
                return {
                  $and: [
                    { [fieldName]: { $ne: String(value) } },
                    { [fieldName]: { $ne: intValue } },
                  ],
                };
              }
            }
          }
          case 'isnull': {
            return {
              $or: [
                { [fieldName]: { $exists: false } },
                { [fieldName]: { $eq: null } },
              ],
            };
          }
          case 'isnotnull': {
            return { [fieldName]: { $exists: true, $ne: null } };
          }
          case 'lt': {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $lt: startDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $lt: startDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $lt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lt: String(value) } },
                  { [fieldName]: { $lt: intValue } },
                ],
              };
            }
          }
          case 'lte': {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $lte: endDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $lte: endDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $lte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lte: String(value) } },
                  { [fieldName]: { $lte: intValue } },
                ],
              };
            }
          }
          case 'gt': {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $gt: endDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $gt: endDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $gt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gt: String(value) } },
                  { [fieldName]: { $gt: intValue } },
                ],
              };
            }
          }
          case 'gte': {
            if (DATE_TYPES.includes(type)) {
              return { [fieldName]: { $gte: startDate } };
            } else if (DATETIME_TYPES.includes(type)) {
              return { [fieldName]: { $gte: startDatetime } };
            } else if (isNaN(intValue)) {
              return { [fieldName]: { $gte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gte: String(value) } },
                  { [fieldName]: { $gte: intValue } },
                ],
              };
            }
          }
          case 'startswith': {
            return { [fieldName]: { $regex: '^' + value, $options: 'i' } };
          }
          case 'endswith': {
            return { [fieldName]: { $regex: value + '$', $options: 'i' } };
          }
          case 'contains': {
            if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $all: value } };
              // Check if a number has been searched globally
              //  If so, perform an 'eq' search
            } else if (isNumber(value?.[0]?.value)) {
              const eq = value.map((v) => {
                return { [`data.${v.field}`]: { $eq: v.value } };
              });
              return { $or: eq };
            } else if (
              fieldName === 'data._globalSearch' &&
              (type === 'text' || type === '')
            ) {
              return;
            } else {
              return { [fieldName]: { $regex: value, $options: 'i' } };
            }
          }
          case 'doesnotcontain': {
            if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $not: { $in: value } } };
            } else {
              return {
                [fieldName]: { $not: { $regex: value, $options: 'i' } },
              };
            }
          }
          case 'in': {
            if (isAttributeFilter)
              return {
                [fieldName]: { $regex: attrValue, $options: 'i' },
              };
          }
          case 'notin': {
            if (isAttributeFilter) {
              return {
                [fieldName]: { $not: { $regex: attrValue, $options: 'i' } },
              };
            }
          }
          case 'isempty': {
            if (MULTISELECT_TYPES.includes(type)) {
              return {
                $or: [
                  { [fieldName]: { $exists: true, $size: 0 } },
                  { [fieldName]: { $exists: false } },
                  { [fieldName]: { $eq: null } },
                ],
              };
            } else {
              return { [fieldName]: { $exists: true, $eq: '' } };
            }
          }
          case 'isnotempty': {
            if (MULTISELECT_TYPES.includes(type)) {
              return { [fieldName]: { $exists: true, $ne: [] } };
            } else {
              return { [fieldName]: { $exists: true, $ne: '' } };
            }
          }
          case 'inthelast': {
            if (DATE_TYPES.includes(type)) {
              const now = Date.now();
              const withinTheLastMs = value * 60 * 1000;
              const dateLowerLimit = new Date(now - withinTheLastMs);
              return { [fieldName]: { $gte: dateLowerLimit } };
            }
          }
          case 'near': {
            return {
              [fieldName]: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: value.geometry,
                  },
                  $maxDistance: value.distance,
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
                    coordinates: value.geometry,
                  },
                  $minDistance: value.distance,
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
                    coordinates: value.geometry,
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
                      coordinates: value.geometry,
                    },
                  },
                },
              },
            };
          }
          default: {
            return;
          }
        }
      } else {
        return;
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
    buildMongoFilter(filter, expandedFields, context, prefix) || {};

  return mongooseFilter;
};
