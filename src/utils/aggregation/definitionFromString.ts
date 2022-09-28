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
      type: 'value',
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

  // recursive case: is an expression
  if (exp.startsWith('calc.')) {
    const operation = exp.split('(')[0].split('.')[1].trim() as any;
    if (!AVAILABLE_OPERATIONS.includes(operation))
      throw new Error('Invalid operation');

    const expectedNumOfArgs = SINGLE_OPERATORS_OPERATIONS.includes(operation)
      ? 1
      : DOUBLE_OPERATORS_OPERATIONS.includes(operation)
      ? 2
      : 'MULTIPLE';

    const args = getArgs(exp.substring(exp.indexOf('(') + 1, exp.length - 1));

    if (expectedNumOfArgs !== 'MULTIPLE' && args.length !== expectedNumOfArgs)
      throw new Error(
        `Invalid number of arguments for operation ${operation}. Expected ${expectedNumOfArgs} but got ${args.length}`
      );

    switch (expectedNumOfArgs) {
      case 1:
        return {
          type: 'expression',
          value: {
            operation,
            operator: solveExp(args[0].trim()),
          },
        };
      case 2:
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
  return solveExp(definition).value as Operation;
};
