import mongoose from 'mongoose';
import { getDateForMongo } from './getDateForMongo';
import { getTimeForMongo } from './getTimeForMongo';
import {
  MULTISELECT_TYPES,
  DATE_TYPES,
  DATETIME_TYPES,
} from '@const/fieldTypes';
import { isUsingTodayPlaceholder } from '@const/placeholders';

/**
 * Transforms query filter into mongo filter.
 *
 * @param filter filter to transform to mongo filter.
 * @param fields list of fields.
 * @returns Mongo filter.
 */
const buildMongoFilter = (filter: any, fields: any[]): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) => buildMongoFilter(x, fields))
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
      if (filter.field === 'ids') {
        return {
          _id: { $in: filter.value.map((x) => new mongoose.Types.ObjectId(x)) },
        };
      }
      if (filter.operator) {
        const fieldName = filter.field;
        const field = fields.find((x) => x.name === filter.field);
        let value = filter.value;
        let intValue: number;
        let endDate: Date;
        let startDatetime: Date;
        let endDatetime: Date;
        switch (field.type) {
          case 'date':
            // startDate represents the beginning of a day
            ({ startDate: value, endDate } = getDateForMongo(value));
            break;
          case 'datetime':
          case 'datetime-local':
            //if we are using the {{today}} operator
            if (isUsingTodayPlaceholder(value)) {
              ({ startDate: startDatetime, endDate: endDatetime } =
                getDateForMongo(value));
            } else {
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
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { [fieldName]: { $size: value.length, $all: value } };
            } else if (DATETIME_TYPES.includes(field.type)) {
              return {
                [fieldName]: { $gte: startDatetime, $lte: endDatetime },
              };
            } else {
              if (DATE_TYPES.includes(field.type)) {
                return { [fieldName]: { $gte: value, $lte: endDate } };
              }
              if (isNaN(intValue)) {
                return { [fieldName]: { $eq: value } };
              } else {
                return {
                  $or: [
                    // Make sure that we check on number & string values
                    { [fieldName]: { $eq: String(value) } },
                    { [fieldName]: { $eq: intValue } },
                  ],
                };
              }
            }
          }
          case 'neq': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              return {
                [fieldName]: { $not: { $size: value.length, $all: value } },
              };
            } else if (DATETIME_TYPES.includes(field.type)) {
              return {
                [fieldName]: {
                  $not: { $gte: startDatetime, $lte: endDatetime },
                },
              };
            } else if (DATE_TYPES.includes(field.type)) {
              return {
                [fieldName]: {
                  $not: { $gte: startDatetime, $lte: endDatetime },
                },
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
            if (DATE_TYPES.includes(field.type)) {
              return { [fieldName]: { $lt: value } };
            } else if (DATETIME_TYPES.includes(field.type)) {
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
            if (DATE_TYPES.includes(field.type)) {
              return { [fieldName]: { $lte: endDate } };
            } else if (DATETIME_TYPES.includes(field.type)) {
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
            if (DATE_TYPES.includes(field.type)) {
              return { [fieldName]: { $gt: endDate } };
            } else if (DATETIME_TYPES.includes(field.type)) {
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
            if (DATE_TYPES.includes(field.type)) {
              return { [fieldName]: { $gte: value } };
            } else if (DATETIME_TYPES.includes(field.type)) {
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
            if (MULTISELECT_TYPES.includes(field.type)) {
              const v = Array.isArray(value) ? value : [value];
              return {
                $or: [
                  { [fieldName]: { $all: v } },
                  {
                    [fieldName]: {
                      $all: v.map((x) => new mongoose.Types.ObjectId(x)),
                    },
                  },
                ],
              };
            } else {
              return { [fieldName]: { $regex: value, $options: 'i' } };
            }
          }
          case 'doesnotcontain': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { [fieldName]: { $not: { $in: value } } };
            } else {
              return {
                [fieldName]: { $not: { $regex: value, $options: 'i' } },
              };
            }
          }
          case 'isempty': {
            if (MULTISELECT_TYPES.includes(field.type)) {
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
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { [fieldName]: { $exists: true, $ne: [] } };
            } else {
              return { [fieldName]: { $exists: true, $ne: '' } };
            }
          }
          case 'in': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              const v = Array.isArray(value) ? value : [value];
              return {
                $or: [
                  { [fieldName]: { $in: v } },
                  {
                    [fieldName]: {
                      $in: v.map((x) => new mongoose.Types.ObjectId(x)),
                    },
                  },
                ],
              };
            } else {
              return { [fieldName]: value };
            }
          }
          case 'notin': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              const v = Array.isArray(value) ? value : [value];
              return {
                $or: [
                  { [fieldName]: { $nin: v } },
                  {
                    [fieldName]: {
                      $nin: v.map((x) => new mongoose.Types.ObjectId(x)),
                    },
                  },
                ],
              };
            } else {
              return { [fieldName]: { $ne: value } };
            }
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
 * @param fields list of fields.
 * @returns Mongo filter.
 */
export default (filter: any, fields: any[]) => {
  const mongooseFilter = filter ? buildMongoFilter(filter, fields) || {} : {};
  return mongooseFilter;
};
