import {
  Operation,
  SingleOperatorOperationsTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operator,
} from '../../const/derivedFields';

/** All the available operations with single operators */
const SINGLE_OPERATORS_OPERATIONS: SingleOperatorOperationsTypes[] = [
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
  'exists',
  'size',
];

/** All the available operations with two operators */
const DOUBLE_OPERATORS_OPERATIONS: DoubleOperatorOperationsTypes[] = [
  'sub',
  'div',
  'gte',
  'gt',
  'lte',
  'lt',
  'eq',
  'ne',
  'datediff',
];

/** All the available operations with multiple operators */
const MULTIPLE_OPERATORS_OPERATIONS: MultipleOperatorsOperationsTypes[] = [
  'add',
  'mul',
  'and',
  'or',
  'concat',
];

/** All the available operations */
const AVAILABLE_OPERATIONS = [
  ...SINGLE_OPERATORS_OPERATIONS,
  ...DOUBLE_OPERATORS_OPERATIONS,
  ...MULTIPLE_OPERATORS_OPERATIONS,
];

/**
 * Parses a string into an operation
 *
 * @param exp The expression to parse
 * @returns The parsed expression (either an Operation or an Operator)
 */
const solveExp = (exp: string): Operation | Operator => {
  // base case: field operator
  if (exp.startsWith('@field.')) {
    return {
      type: 'field',
      value: exp.substring(7),
    };
  }

  // base case: constant operator
  if (exp.startsWith('@const(')) {
    const valueStr = exp.substring(7, exp.length - 1);

    let value: boolean | number | string = valueStr;

    if (valueStr.startsWith('"') && valueStr.endsWith('"'))
      value = valueStr.substring(1, valueStr.length - 1);
    else if (!isNaN(Number(valueStr))) value = Number(valueStr);
    else if (valueStr === 'true') value = true;
    else if (valueStr === 'false') value = false;

    return {
      type: 'value',
      value,
    };
  }
  // recursive case: is an expression
  if (exp.startsWith('@exp.')) {
    const operation = exp.split('(')[0].split('.')[1] as any;
    // @TODO: Internalization of error messages
    if (!AVAILABLE_OPERATIONS.includes(operation))
      throw new Error('Invalid operation');

    const expectedNumOfArgs = SINGLE_OPERATORS_OPERATIONS.includes(operation)
      ? 1
      : DOUBLE_OPERATORS_OPERATIONS.includes(operation)
      ? 2
      : 'MULTIPLE';

    const args = exp
      .substring(exp.indexOf('(') + 1, exp.length - 1)
      // Splits on semicolons that are not inside parenthesis or inside quotes
      .split(/;(?![^(]*\))(?![^"']*["'](?:[^"']*["'][^"']*["'])*[^"']*$)/);

    if (expectedNumOfArgs !== 'MULTIPLE' && args.length !== expectedNumOfArgs)
      throw new Error(
        `Invalid number of arguments for operation ${operation}. Expected ${expectedNumOfArgs} but got ${args.length}`
      );

    switch (expectedNumOfArgs) {
      case 1:
        return {
          operation,
          operator: solveExp(args[0].trim()),
        } as Operation;
      case 2:
        return {
          operation,
          operator1: solveExp(args[0].trim()),
          operator2: solveExp(args[1].trim()),
        } as Operation;
      case 'MULTIPLE':
        return {
          operation,
          operators: args.map((arg) => solveExp(arg.trim())),
        } as Operation;
    }
  }
};

/**
 * Transforms an operation definition into the Operation structure
 *
 * @param definition The operation definition of the derived field in string format
 * @returns The operation definition of the derived field in Operation format
 */
export const getDefinitionFromString = (definition: string): Operation => {
  definition = definition.trim();
  return solveExp(definition) as Operation;
};
