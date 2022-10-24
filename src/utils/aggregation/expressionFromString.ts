import {
  Operation,
  SingleOperatorOperationsTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operator,
  OperationTypes,
} from '../../const/calculatedFields';

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
  'date',
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
  'if',
];

/** Map of operations to field type */
export const OperationTypeMap: { [key in OperationTypes]: string } = {
  add: 'numeric',
  sub: 'numeric',
  mul: 'numeric',
  div: 'numeric',
  gte: 'boolean',
  gt: 'boolean',
  lte: 'boolean',
  lt: 'boolean',
  eq: 'boolean',
  ne: 'boolean',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  millisecond: 'numeric',
  exists: 'boolean',
  size: 'numeric',
  date: 'date',
  datediff: 'numeric',
  and: 'boolean',
  or: 'boolean',
  concat: 'text',
  today: 'date',
  if: 'text',
};

/** All the available operations */
const AVAILABLE_OPERATIONS = Object.keys(OperationTypeMap);
/**
 * Gets the expected number of arguments for an operation and its type
 *
 * @param operation The operation to get the expected number of arguments of
 * @returns The expected number of arguments of the operation and the type of the operation
 */
const getExpectedNumberOfArgs = (
  operation: string
): { max: number; min: number; type: string } => {
  if (
    SINGLE_OPERATORS_OPERATIONS.includes(
      operation as SingleOperatorOperationsTypes
    )
  ) {
    return {
      max: 1,
      min: 1,
      type: 'SINGLE',
    };
  }
  if (
    DOUBLE_OPERATORS_OPERATIONS.includes(
      operation as DoubleOperatorOperationsTypes
    )
  ) {
    return {
      max: 2,
      min: 2,
      type: 'DOUBLE',
    };
  }
  if (
    MULTIPLE_OPERATORS_OPERATIONS.includes(
      operation as MultipleOperatorsOperationsTypes
    )
  ) {
    if (operation !== 'if') {
      return {
        max: Infinity,
        min: 2,
        type: 'MULTIPLE',
      };
    } else {
      return {
        max: 3,
        min: 1,
        type: 'MULTIPLE',
      };
    }
  }
  if (operation === 'today') {
    return {
      max: 1,
      min: 0,
      type: 'SINGLE_OPTIONAL',
    };
  }
};

/**
 * Gets an array of arguments from a string expression
 *
 * @param exp The string expression to get arguments of
 * @returns An array of the arguments of the expression
 */
const getArgs = (exp: string): string[] => {
  const args: string[] = [];
  let expBegin = 0;
  let bracesCount = 0;
  let stringType: 'NONE' | 'SINGLE' | 'DOUBLE' = 'NONE';
  for (let i = 0; i < exp.length; i++) {
    if (i === exp.length - 1) {
      args.push(exp.substring(expBegin, i + 1));
      break;
    }
    switch (exp[i]) {
      case '{':
        bracesCount++;
        break;
      case '}':
        bracesCount--;
        break;
      case '"':
        if (stringType === 'DOUBLE') stringType = 'NONE';
        else if (stringType === 'NONE') stringType = 'DOUBLE';

        break;
      case "'":
        if (stringType === 'SINGLE') stringType = 'NONE';
        else if (stringType === 'NONE') stringType = 'SINGLE';
        break;
      case ';':
        if (bracesCount === 0 && stringType === 'NONE') {
          args.push(exp.substring(expBegin, i));
          expBegin = i + 1;
        }
    }
  }
  return args;
};

/**
 * Parses a string into an operation
 *
 * @param exp The expression to parse
 * @returns The parsed operator
 */
const solveExp = (exp: string): Operator => {
  // base case: constant
  if (!exp.startsWith('{{')) {
    let value: boolean | number | string = exp;

    if (
      (exp.startsWith('"') && exp.endsWith('"')) ||
      (exp.startsWith("'") && exp.endsWith("'"))
    )
      value = exp.substring(1, exp.length - 1);
    else if (!isNaN(Number(exp))) value = Number(exp);
    else if (exp === 'true') value = true;
    else if (exp === 'false') value = false;
    else if (exp === 'null') value = null;
    else throw new Error(`Unexpected operator: ${exp}`);

    return {
      type: 'const',
      value,
    };
  }

  // starts with '{{'
  if (!exp.endsWith('}}')) throw new Error(`Invalid operation: ${exp}`);
  exp = exp.substring(2, exp.length - 2).trim();

  // base case: field operator
  if (exp.startsWith('data.')) {
    return {
      type: 'field',
      value: exp.substring(5),
    };
  }

  // base case: info operator
  if (exp.startsWith('info.')) {
    return {
      type: 'info',
      value: exp.substring(5),
    };
  }

  // recursive case: is an expression
  if (exp.startsWith('calc.')) {
    const operation = exp.split('(')[0].split('.')[1].trim() as any;
    if (!AVAILABLE_OPERATIONS.includes(operation))
      throw new Error(`Invalid operation: ${operation}`);

    const expectedNumOfArgs = getExpectedNumberOfArgs(operation);
    const args = getArgs(exp.substring(exp.indexOf('(') + 1, exp.length - 1));

    if (
      args.length > expectedNumOfArgs.max ||
      args.length < expectedNumOfArgs.min
    )
      throw new Error(
        `Invalid number of arguments for operation ${operation}: ${args.length}. Expected ${expectedNumOfArgs.min} to ${expectedNumOfArgs.max}`
      );

    switch (expectedNumOfArgs.type) {
      case 'SINGLE':
        return {
          type: 'expression',
          value: {
            operation,
            operator: solveExp(args[0].trim()),
          },
        };

      case 'DOUBLE':
        return {
          type: 'expression',
          value: {
            operation,
            operator1: solveExp(args[0].trim()),
            operator2: solveExp(args[1].trim()),
          },
        };

      case 'MULTIPLE':
        return {
          type: 'expression',
          value: {
            operation,
            operators: args.map((arg) => solveExp(arg.trim())),
          },
        };

      case 'SINGLE_OPTIONAL':
        return {
          type: 'expression',
          value: {
            operation,
            operator: args.length === 0 ? null : solveExp(args[0].trim()),
          },
        };
    }
  }
};

/**
 * Transforms an operation expression into the Operation structure
 *
 * @param expression The operation expression of the calculated field in string format
 * @returns The operation expression of the calculated field in Operation format
 */
export const getExpressionFromString = (expression: string): Operation => {
  expression = expression.trim();
  return solveExp(expression).value as Operation;
};
