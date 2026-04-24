import { CompositeFilterDescriptor } from '../types/filter';

/** Supported display modifiers for field operators */
export type FieldDisplayMode = 'text';

/** Typed value for field operators */
export interface FieldOperatorValue {
  field: string;
  display?: FieldDisplayMode;
}

/** Interface for constant operators */
interface ConstOperator {
  type: 'const';
  value: string | number | boolean;
}

/** Interface for field operators */
interface FieldOperator {
  type: 'field';
  value: FieldOperatorValue;
}

/** Interface for info operators */
interface InfoOperator {
  type: 'info';
  value: string;
}

/**
 * Interface for a recursive operator
 */
interface RecursiveOperator {
  type: 'expression';
  value: Operation;
}

export type Operator =
  | ConstOperator
  | FieldOperator
  | InfoOperator
  | RecursiveOperator;

export type OperationTypes =
  | SingleOperatorOperationsTypes
  | DoubleOperatorOperationsTypes
  | MultipleOperatorsOperationsTypes
  | 'today'
  | 'relatedField';

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
  | 'includes';

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

/** Interface for a related child record selector */
export interface RelatedFieldOperation {
  operation: 'relatedField';
  relation: string;
  field: string;
  first: 1;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: CompositeFilterDescriptor;
}

export type Operation =
  | MultipleOperatorsOperation
  | TodayOperation
  | SingleOperatorOperation
  | DoubleOperatorOperation
  | RelatedFieldOperation;

export type ParsedCalculatedExpression = Operation | Operator;
