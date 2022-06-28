/** Authorized filter type names */
const AUTHORIZED_FILTER_TYPES = [
  'text',
  'numeric',
  'color',
  'date',
  'datetime-local',
  'datetime',
  'time',
  'decimal',
  'dropdown',
  'tagbox',
  'boolean',
];

/** Default field names */
const DEFAULT_FIELDS_NAMES = ['id', 'createdAt', 'modifiedAt'];

/** Default question fields */
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

/**
 * Returns the key value of a field in record objects.
 *
 * @param key name of the field
 * @returns key value in record objects.
 */
const getKey = (key: string) => {
  return DEFAULT_FIELDS_NAMES.includes(key) ? key : `data.${key}`;
};

/**
 * Transforms Form filter exposed in API into Mongo filter
 *
 * @param filters filters to transform to a Mongo filter
 * @param fields definition of the fields of the form
 * @returns Mongo filter calculated from the Form filter
 */
export const getFormFilter = (filters: any, fields: any[]): any => {
  const expandedFields = fields.concat(DEFAULT_FIELDS);

  if (!filters) {
    return {};
  }

  const mongooseFilters = {};

  for (const filter of filters) {
    if (
      !!filter.value &&
      ((typeof filter.value === 'object' && filter.value.length > 0) ||
        (typeof filter.value === 'string' && filter.value.trim().length > 0))
    ) {
      let value = filter.value;
      const field = expandedFields.find((x) => x.name === filter.field);
      if (field && AUTHORIZED_FILTER_TYPES.includes(field.type)) {
        switch (field.type) {
          case 'date':
            value = new Date(value);
            break;
          case 'datetime':
            value = new Date(value);
            break;
          case 'datetime-local':
            value = new Date(value);
            break;
          case 'time': {
            value = new Date(value);
            const hours = value.slice(0, 2);
            const minutes = value.slice(3);
            value = new Date(Date.UTC(1970, 0, 1, hours, minutes));
            break;
          }
          default:
            break;
        }
        switch (filter.operator) {
          case 'contains':
            if (field.type === 'tagbox' || typeof value === 'object') {
              mongooseFilters[getKey(filter.field)] = { $in: value };
            } else {
              mongooseFilters[getKey(filter.field)] = {
                $regex: String(value),
                $options: 'i',
              };
            }
            break;
          case '=':
            if (field.type === 'tagbox' || typeof value === 'object') {
              mongooseFilters[getKey(filter.field)] = { $in: value };
            } else {
              mongooseFilters[getKey(filter.field)] = { $eq: value };
            }
            break;
          case '!=':
            if (field.type === 'tagbox' || typeof value === 'object') {
              mongooseFilters[getKey(filter.field)] = { $nin: value };
            } else {
              mongooseFilters[getKey(filter.field)] = { $eq: value };
            }
            break;
          case '>':
            mongooseFilters[getKey(filter.field)] = { $gt: value };
            break;
          case '>=':
            mongooseFilters[getKey(filter.field)] = { $gte: value };
            break;
          case '<':
            mongooseFilters[getKey(filter.field)] = { $lt: value };
            break;
          case '<=':
            mongooseFilters[getKey(filter.field)] = { $lte: value };
            break;
          default:
            break;
        }
      }
    }
  }
  return mongooseFilters;
};
