import { eq, get, isArray, isNil, isString } from 'lodash';
import { filterOperator } from 'types';

/**
 * Apply filter on item
 *
 * @param item Reference data item
 * @param filter filter
 * @returns is filter applied
 */
export const filterReferenceData = (item: any, filter: any) => {
  try {
    if (filter.logic && filter.filters) {
      const results = filter.filters.map((subFilter: any) =>
        filterReferenceData(item, subFilter)
      );
      return filter.logic === 'and'
        ? results.every(Boolean)
        : results.length
        ? results.some(Boolean)
        : true;
    } else {
      const value = get(item, filter.field);
      let intValue: number | null;
      try {
        intValue = Number(filter.value);
      } catch {
        intValue = null;
      }
      switch (filter.operator) {
        case filterOperator.EQUAL_TO:
          if (typeof filter.value === 'boolean') {
            return eq(value, String(filter.value)) || eq(value, filter.value);
          } else {
            return eq(value, String(filter.value)) || eq(value, intValue);
          }
        case 'ne':
        case filterOperator.NOT_EQUAL_TO:
          if (typeof filter.value === 'boolean') {
            return !(
              eq(value, String(filter.value)) || eq(value, filter.value)
            );
          } else {
            return !(eq(value, String(filter.value)) || eq(value, intValue));
          }
        case filterOperator.GREATER_THAN:
          return !isNil(value) && value > filter.value;
        case filterOperator.GREATER_THAN_OR_EQUAL:
          return !isNil(value) && value >= filter.value;
        case filterOperator.LESS_THAN:
          return !isNil(value) && value < filter.value;
        case filterOperator.LESS_THAN_OR_EQUAL:
          return !isNil(value) && value <= filter.value;
        case filterOperator.IS_NULL:
          return isNil(value);
        case filterOperator.IS_NOT_NULL:
          return !isNil(value);
        case filterOperator.STARTS_WITH:
          return !isNil(value) && value.startsWith(filter.value);
        case filterOperator.ENDS_WITH:
          return !isNil(value) && value.endsWith(filter.value);
        case filterOperator.CONTAINS:
          if (isString(filter.value)) {
            const regex = new RegExp(filter.value, 'i');
            if (isString(value)) {
              return !isNil(value) && regex.test(value);
            } else {
              return !isNil(value) && value.includes(filter.value);
            }
          } else {
            return !isNil(value) && value.includes(filter.value);
          }
        case filterOperator.DOES_NOT_CONTAIN:
          if (isString(filter.value)) {
            const regex = new RegExp(filter.value, 'i');
            if (isString(value)) {
              return isNil(value) || !regex.test(value);
            } else {
              return isNil(value) || !value.includes(filter.value);
            }
          } else {
            return isNil(value) || !value.includes(filter.value);
          }
        case 'in':
          if (isString(value)) {
            if (isArray(filter.value)) {
              return !isNil(filter.value) && filter.value.includes(value);
            } else {
              const regex = new RegExp(value, 'i');
              return !isNil(filter.value) && regex.test(filter.value);
            }
          } else {
            return !isNil(filter.value) && filter.value.includes(value);
          }
        case 'notin':
          if (isString(value)) {
            if (isArray(filter.value)) {
              return isNil(filter.value) || !filter.value.includes(value);
            } else {
              const regex = new RegExp(value, 'i');
              return isNil(filter.value) || !regex.test(filter.value);
            }
          } else {
            return isNil(filter.value) || !filter.value.includes(value);
          }
        default:
          return false;
      }
    }
  } catch {
    return false;
  }
};

export default filterReferenceData;
