/**
 * Interface for a simple operator
 * If type is 'value', the operator is a constant, stored in the value field
 * If type is 'field', the operator is the value for that the field with the name stored in value
 */
interface SimpleOperator {
  type: 'const' | 'field' | 'info' | 'user';
  value: string | number | boolean | null;
}

/**
 * Interface for a recursive operator
 */
interface RecursiveOperator {
  type: 'expression';
  value: Operation;
}

export type Operator = SimpleOperator | RecursiveOperator;

export type OperationTypes =
  | SingleOperatorOperationsTypes
  | DoubleOperatorOperationsTypes
  | MultipleOperatorsOperationsTypes
  | RelatedOperationTypes
  | 'today'
  | 'displayValue';

/** Operation that resolves a choice/refData field stored value to its display label */
interface DisplayValueOperation {
  operation: 'displayValue';
  fieldName: string;
}

export type RelatedOperationTypes =
  | 'relatedValue'
  | 'relatedCount'
  | 'relatedExists'
  | 'relatedSum'
  | 'relatedMin'
  | 'relatedMax'
  | 'relatedAvg';

/**
 * Operation that aggregates over the records of a related resource linking to
 * the current record through a reverse link (`relatedName`). All arguments are
 * literals resolved at build time, not sub-expressions.
 */
export interface RelatedOperation {
  operation: RelatedOperationTypes;
  /** Reverse link name (the `relatedName` of a resource field pointing at this resource) */
  relatedName: string;
  /** Child field whose value is extracted/aggregated (all but relatedCount/relatedExists) */
  valueField?: string;
  /** Child field the related records are sorted by before picking the first one (relatedValue) */
  sortField?: string;
  /** Sort direction (relatedValue) */
  sortOrder?: 'asc' | 'desc';
  /** Optional composite filter (same JSON format as grid filters) applied to the related records */
  filter?: any;
}

/** Interface for the 'today' operation */
interface TodayOperation {
  operation: 'today';
  operator: Operator | null;
}

export type DateOperationTypes =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';

export type SingleOperatorOperationsTypes =
  | DateOperationTypes
  | 'date'
  | 'exists'
  | 'size'
  | 'toInt'
  | 'toLong';
/** Interface for an operation with a single operator */
interface SingleOperatorOperation {
  operation: SingleOperatorOperationsTypes;
  operator: Operator;
}
export type DoubleOperatorOperationsTypes =
  | 'sub'
  | 'div'
  | 'gte'
  | 'gt'
  | 'lte'
  | 'lt'
  | 'eq'
  | 'ne'
  | 'datediff'
  | 'includes'
  | 'join';

/** Interface for an operation with two operators (the order matters) */
interface DoubleOperatorOperation {
  operation: DoubleOperatorOperationsTypes;
  operator1: Operator;
  operator2: Operator;
}

export type MultipleOperatorsOperationsTypes =
  | 'add'
  | 'mul'
  | 'and'
  | 'or'
  | 'if'
  | 'concat'
  | 'substr';
/** Interface for an operation with multiple operators */
interface MultipleOperatorsOperation {
  operation: MultipleOperatorsOperationsTypes;
  operators: Operator[];
}

export type Operation =
  | MultipleOperatorsOperation
  | TodayOperation
  | SingleOperatorOperation
  | DoubleOperatorOperation
  | DisplayValueOperation
  | RelatedOperation;
