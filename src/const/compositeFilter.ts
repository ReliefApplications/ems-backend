import { filterOperator } from './filterOperators';

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
