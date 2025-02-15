/**
 * Represents the supported operators.
 *
 * `"eq"` (equal to)
 * `"neq"` (not equal to)
 * `"isnull"` (is equal to null)
 * `"isnotnull"` (is not equal to null)
 * `"lt"` (less than)
 * `"lte"` (less than or equal to)
 * `"gt"` (greater than)
 * `"gte"` (greater than or equal to)
 * `"in"` (in)
 * `"notin"` (not in)
 *
 * The following operators are supported for string fields only:
 * `"startswith"`
 * `"endswith"`
 * `"contains"`
 * `"doesnotcontain"`
 * `"isempty"`
 * `"isnotempty"`
 */
export enum filterOperator {
  CONTAINS = 'contains',
  DOES_NOT_CONTAIN = 'doesnotcontain',
  DOES_NOT_END_WITH = 'doesnotendwith',
  DOES_NOT_START_WITH = 'doesnotstartwith',
  ENDS_WITH = 'endswith',
  EQUAL_TO = 'eq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  IS_EMPTY = 'isempty',
  IS_NOT_EMPTY = 'isnotempty',
  IS_NOT_NULL = 'isnotnull',
  IS_NULL = 'isnull',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  NOT_EQUAL_TO = 'neq',
  STARTS_WITH = 'startswith',
  IN = 'in',
  NOT_IN = 'notin',
}

/**
 * Type for the filter descriptor used by @progress/kendo-data-query on frontend.
 */

/**
 * A basic filter expression. Usually is a part of CompositeFilterDescriptor.
 */
type FilterDescriptor = {
  /** The data item field to which the filter operator is applied. */
  field?: string;
  /** The filter operator (comparison). */
  operator: filterOperator;
  /** The value to which the field is compared. Has to be of the same type as the field. */
  value?: any;
  /** Determines if the string comparison is case-insensitive. */
  ignoreCase?: boolean;
};

/**
 * A complex filter expression.
 */
export type CompositeFilterDescriptor = {
  /**
   * The logical operation to use when the `filter.filters` option is set.
   *
   * The supported values are:
   * `and`
   * `or`
   */
  logic: 'or' | 'and';
  /**
   * The nested filter expressions&mdash;either FilterDescriptor, or CompositeFilterDescriptor.
   *  Supports the same options as `filter`. You can nest filters indefinitely.
   */
  filters: Array<FilterDescriptor | CompositeFilterDescriptor>;
};
