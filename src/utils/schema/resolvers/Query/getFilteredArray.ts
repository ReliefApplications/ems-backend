/**
 * Apply the filter provided to the specified field
 *
 * @param data Array of fields
 * @param filter Filter object
 * @returns Returns a boolean with the result of the filter
 */
const applyFilters = (data: any, filter: any): boolean => {
  if (filter.logic) {
    switch (filter.logic) {
      case 'or':
        return filter.filters.some((f: any) => applyFilters(data, f));
      case 'and':
        return filter.filters.every((f: any) => applyFilters(data, f));
      default:
        return data;
    }
  }
  const value = data[filter.field];
  switch (filter.operator) {
    case 'eq': {
      // equal
      return value === filter.value;
    }
    case 'neq': {
      // not equal
      return value !== filter.value;
    }
    case 'isnull': {
      return value === null;
    }
    case 'isnotnull': {
      return value !== null;
    }
    case 'lt': {
      // lesser
      return value < filter.value;
    }
    case 'lte': {
      // lesser or equal
      return value <= filter.value;
    }
    case 'gt': {
      // greater
      return value > filter.value;
    }
    case 'gte': {
      // greater or equal
      return value >= filter.value;
    }
    case 'startswith': {
      if (!value) {
        return false;
      }
      return value[0] === filter.value;
    }
    case 'endswith': {
      if (!value) {
        return false;
      }
      return value[value.length] === filter.value;
    }
    case 'contains': {
      if (!value) {
        return false;
      }
      for (let i = 0; value[i]; i++) {
        if (value[i] === filter.value) {
          return true;
        }
      }
      return false;
    }
    case 'doesnotcontain': {
      if (!value) {
        return true;
      }
      for (let i = 0; value[i]; i++) {
        if (value[i] === filter.value) {
          return false;
        }
      }
      return true;
    }
    case 'isempty': {
      if (!value) {
        return true;
      }
      return value.length <= 0;
    }
    case 'isnotempty': {
      if (!value) {
        return false;
      }
      return value.length > 0;
    }
    default: {
      return false;
    }
  }
};

/**
 * a
 *
 * @param data a
 * @param filter a
 * @returns a
 */
const getFilteredArray = (data: any, filter: any): any => {
  return data.filter((item) => {
    return applyFilters(item, filter);
  });
};

/**
 * filter data from an aggregation pipeline
 *
 * @param data data to filter
 * @param filter filter to apply
 * @returns filtered data
 */
export default (data: any, filter: any) => {
  return getFilteredArray(data, filter);
};
