import { isEmpty } from 'lodash';
import mongoose from 'mongoose';
import { FLAT_DEFAULT_FIELDS } from './getFilter';

const USER_DEFAULT_FIELDS = ['createdBy', 'lastUpdatedBy'];

/**
 * Transforms query filter into user mongo filter.
 *
 * @param filter filter to transform to user mongo filter.
 * @param fields list of fields
 * @param context context of request
 * @returns User mongo filter.
 */
const buildObjectMongoFilter = (
  filter: any,
  fields: any[],
  context: any
): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) => buildObjectMongoFilter(x, fields, context))
      .filter((x) => !isEmpty(x));
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
          _id: { $in: filter.value.map((x) => mongoose.Types.ObjectId(x)) },
        };
      }
      if (filter.operator) {
        const [field, subField] = filter.field.split('.');
        let fieldName: string;

        if (!field || !subField) {
          return;
        }

        if (USER_DEFAULT_FIELDS.includes(field)) {
          fieldName = `_${field}.user.${subField}`;
        } else {
          if (FLAT_DEFAULT_FIELDS.includes(subField)) {
            fieldName = `_${field}.${subField}`;
          } else {
            fieldName = `_${field}.data.${subField}`;
          }
        }

        const value = filter.value;
        let intValue: number;

        try {
          intValue = Number(value);
        } catch {}

        switch (filter.operator) {
          case 'eq': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $eq: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $eq: value } },
                  { [fieldName]: { $eq: intValue } },
                ],
              };
            }
          }
          case 'neq': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $ne: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $ne: value } },
                  { [fieldName]: { $ne: intValue } },
                ],
              };
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
            if (isNaN(intValue)) {
              return { [fieldName]: { $lt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lt: value } },
                  { [fieldName]: { $lt: intValue } },
                ],
              };
            }
          }
          case 'lte': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $lte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $lte: value } },
                  { [fieldName]: { $lte: intValue } },
                ],
              };
            }
          }
          case 'gt': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $gt: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gt: value } },
                  { [fieldName]: { $gt: intValue } },
                ],
              };
            }
          }
          case 'gte': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $gte: value } };
            } else {
              return {
                $or: [
                  { [fieldName]: { $gte: value } },
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
            return { [fieldName]: { $regex: value, $options: 'i' } };
          }
          case 'doesnotcontain': {
            return { [fieldName]: { $not: { $regex: value, $options: 'i' } } };
          }
          case 'isempty': {
            return { [fieldName]: { $exists: true, $eq: '' } };
          }
          case 'isnotempty': {
            return { [fieldName]: { $exists: true, $ne: '' } };
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

export default (filter: any, fields: any[], context?: any) => {
  const mongooseFilter = buildObjectMongoFilter(filter, fields, context) || {};
  return mongooseFilter;
};
