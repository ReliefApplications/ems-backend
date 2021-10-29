import mongoose from 'mongoose';

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
];

const FLAT_DEFAULT_FIELDS = ['id', 'createdAt', 'modifiedAt'];

const MULTISELECT_TYPES: string[] = ['checkbox', 'tagbox', 'owner'];

const DATE_TYPES: string[] = ['date', 'datetime', 'datetime-local'];

/**
 * Transforms query filter into mongo filter.
 * @param filter filter to transform to mongo filter.
 * @returns Mongo filter.
 */
const buildMongoFilter = (filter: any, fields: any[]): any => {
  if (filter.filters) {
    const filters = filter.filters.map((x: any) => buildMongoFilter(x, fields)).filter(x => x);
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
        return { _id: { $in: filter.value.map(x => mongoose.Types.ObjectId(x)) } };
      }
      if (filter.operator) {
        const fieldName = FLAT_DEFAULT_FIELDS.includes(filter.field) ? filter.field : `data.${filter.field}`;
        const field = fields.find(x => x.name === filter.field);
        let value = filter.value;
        let intValue: number;
        let startDate: Date;
        let endDate: Date;
        switch (field.type) {
          case 'date':
            if (value === 'today()') {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
              value = new Date();
            } else {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
            }
            break;
          case 'datetime':
            if (value === 'today()') {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
              value = new Date();
            } else {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
            }
            break;
          case 'datetime-local':
            if (value === 'today()') {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
              value = new Date();
            } else {
              startDate = new Date();
              startDate.setHours(0, 0, 0, 0);
              endDate = new Date();
              endDate.setHours(23, 59, 59, 999);
            }
            break;
          case 'time': {
            const hours = value.slice(0, 2);
            const minutes = value.slice(3);
            value = new Date(Date.UTC(1970, 0, 1, hours, minutes));
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
            } else {
              if (DATE_TYPES.includes(field.type)) {
                return { [fieldName]: { $gte: startDate, $lt: endDate } };
              }
              if (isNaN(intValue)) {
                return { [fieldName]: { $eq: value } };
              } else {
                return { $or: [{ [fieldName]: { $eq: value } }, { [fieldName]: { $eq: intValue } }] };
              }
            }
          }
          case 'neq': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { [fieldName]: { $not: { $size: value.length, $all: value } } };
            } else {
              if (isNaN(intValue)) {
                return { [fieldName]: { $ne: value } };
              } else {
                return { $or: [{ [fieldName]: { $ne: value } }, { [fieldName]: { $ne: intValue } }] };
              }
            }
          }
          case 'isnull': {
            return { $or: [{ [fieldName]: { $exists: false } }, { [fieldName]: { $eq: null } }] };
          }
          case 'isnotnull': {
            return { [fieldName]: { $exists: true, $ne: null } };
          }
          case 'lt': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $lt: value } };
            } else {
              return { $or: [{ [fieldName]: { $lt: value } }, { [fieldName]: { $lt: intValue } }] };
            }
          }
          case 'lte': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $lte: value } };
            } else {
              return { $or: [{ [fieldName]: { $lte: value } }, { [fieldName]: { $lte: intValue } }] };
            }
          }
          case 'gt': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $gt: value } };
            } else {
              return { $or: [{ [fieldName]: { $gt: value } }, { [fieldName]: { $gt: intValue } }] };
            }
          }
          case 'gte': {
            if (isNaN(intValue)) {
              return { [fieldName]: { $gte: value } };
            } else {
              return { $or: [{ [fieldName]: { $gte: value } }, { [fieldName]: { $gte: intValue } }] };
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
              return { [fieldName]: { $all: value } };
            } else {
              return { [fieldName]: { $regex: value, $options: 'i' } };
            }
          }
          case 'doesnotcontain': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { [fieldName]: { $not: { $in: value } } };
            } else {
              return { [fieldName]: { $not: { $regex: value, $options: 'i' } } };
            }
          }
          case 'isempty': {
            if (MULTISELECT_TYPES.includes(field.type)) {
              return { $or: [{ [fieldName]: { $exists: true, $size: 0 } }, { [fieldName]: { $exists: false } }, { [fieldName]: { $eq: null } }] };
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

export default (filter: any, fields: any[]) => {
  const expandedFields = fields.concat(DEFAULT_FIELDS);
  const mongooseFilter = buildMongoFilter(filter, expandedFields) || {};
  return mongooseFilter;
};
