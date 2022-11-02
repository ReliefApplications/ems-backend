import mongoose from 'mongoose';

/** The  default fields for the user */
const USER_DEFAULT_FIELDS = ['createdBy', 'lastUpdatedBy'];

/**
 * Transforms query filter into user mongo filter.
 *
 * @param filter filter to transform to user mongo filter.
 * @param fields list of fields
 * @param context context of request
 * @returns User mongo filter.
 */
const buildAfterLookupsMongoFilter = (
  filter: any,
  fields: any[],
  context: any
): any => {
  if (filter.filters) {
    const filters = filter.filters
      .map((x: any) => buildAfterLookupsMongoFilter(x, fields, context))
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
          _id: { $in: filter.value.map((x) => mongoose.Types.ObjectId(x)) },
        };
      }
      if (filter.operator) {
        const [field, subField] = filter.field.split('.');

        // If it's not a user or a form field, return
        if (!USER_DEFAULT_FIELDS.includes(field) && filter.field !== 'form') {
          return;
        }
        //
        let fieldName: string;
        if (filter.field === 'form') {
          filter.value = mongoose.Types.ObjectId(filter.value);
          fieldName = '_form._id';
        } else {
          fieldName = `_${field}.user.${subField}`;
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

/**
 * Transforms query filter into user mongo filter.
 *
 * @param filter filter to transform to user mongo filter.
 * @param fields list of fields
 * @param context context of request
 * @returns User mongo filter.
 */
export default (filter: any, fields: any[], context?: any) => {
  const mongooseFilter =
    buildAfterLookupsMongoFilter(filter, fields, context) || {};
  return mongooseFilter;
};
