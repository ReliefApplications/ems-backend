/**
 * Represents the list of supported [`FilterDescriptor`]({% slug api_kendo-data-query_filterdescriptor %}) operators.
 * Allows restricting `FilterDescriptorInputType.operator` definition to available values only.
 *
 * The supported operators are:
 * `"eq"` (equal to)
 * `"neq"` (not equal to)
 * `"isnull"` (is equal to null)
 * `"isnotnull"` (is not equal to null)
 * `"lt"` (less than)
 * `"lte"` (less than or equal to)
 * `"gt"` (greater than)
 * `"gte"` (greater than or equal to)
 *
 * The following operators are supported for string fields only:
 * `"startswith"`
 * `"endswith"`
 * `"contains"`
 * `"doesnotcontain"`
 * `"isempty"`
 * `"isnotempty"`
 */
export declare enum filterOperator {
  /** The `contains` operator. */
  CONTAINS = 'contains',
  /** The `doesnotcontain` operator. */
  DOES_NOT_CONTAIN = 'doesnotcontain',
  /** The `doesnotendwith` operator. */
  DOES_NOT_END_WITH = 'doesnotendwith',
  /** The `doesnotstartwith` operator. */
  DOES_NOT_START_WITH = 'doesnotstartwith',
  /** The `endswith` operator. */
  ENDS_WITH = 'endswith',
  /** THE `EQ` OPERATOR. */
  EQUAL_TO = 'eq',
  /** The `gt` operator. */
  GREATER_THAN = 'gt',
  /** The `gte` operator. */
  GREATER_THAN_OR_EQUAL = 'gte',
  /** The `isempty` operator. */
  IS_EMPTY = 'isempty',
  /** The `isnotempty` operator. */
  IS_NOT_EMPTY = 'isnotempty',
  /** The `isnotnull` operator. */
  IS_NOT_NULL = 'isnotnull',
  /** The `isnull` operator. */
  IS_NULL = 'isnull',
  /** The `lt` operator. */
  LESS_THAN = 'lt',
  /** The `lte` operator. */
  LESS_THAN_OR_EQUAL = 'lte',
  /** The `neq` operator. */
  NOT_EQUAL_TO = 'neq',
  /** The `startswith` operator. */
  STARTS_WITH = 'startswith',
}
