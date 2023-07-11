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
  return data[filter.field] === filter.value;
};

/**
 * filters the data with the given pipeline filter
 *
 * @param data data to be filtered
 * @param filter pipeline filter
 * @returns filtered data
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
