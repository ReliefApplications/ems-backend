import {
  FieldOperatorValue,
  Operation,
  ParsedCalculatedExpression,
  RelatedFieldOperation,
  SingleOperatorOperationsTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operator,
  OperationTypes,
} from '../../const/calculatedFields';

/** json5 keeps selector args readable while still giving us a real parser. */
// eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
const JSON5 = require('json5');

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
  'toInt',
  'toLong',
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
  'includes',
];

/** All the available operations with multiple operators */
const MULTIPLE_OPERATORS_OPERATIONS: MultipleOperatorsOperationsTypes[] = [
  'add',
  'mul',
  'and',
  'or',
  'concat',
  'if',
  'substr',
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
  substr: 'text',
  toInt: 'numeric',
  toLong: 'numeric',
  includes: 'boolean',
  relatedField: 'text',
};

/** All the available operations */
const AVAILABLE_OPERATIONS = Object.keys(OperationTypeMap);

/**
 * Gets the expected number of arguments for an operation and its type.
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
    switch (operation) {
      case 'if':
        return {
          max: 3,
          min: 1,
          type: 'MULTIPLE',
        };
      case 'substr':
        return {
          max: 3,
          min: 3,
          type: 'MULTIPLE',
        };
      default:
        return {
          max: Infinity,
          min: 2,
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
 * Gets an array of arguments from a string expression.
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
        break;
      default:
        break;
    }
  }

  return args;
};

/**
 * Parses a field reference, including its optional display modifier.
 *
 * @param exp The field expression without the `data.` prefix
 * @returns Parsed field reference
 */
const parseFieldReference = (exp: string): FieldOperatorValue => {
  if (exp.endsWith(':text')) {
    return {
      field: exp.slice(0, -5),
      display: 'text',
    };
  }

  return {
    field: exp,
  };
};

/**
 * Parses a `data.<relation>(...).<field>` selector.
 *
 * @param exp Expression without the surrounding curly braces
 * @returns Related field operation, if the expression matches that syntax
 */
const getRelatedFieldOperation = (
  exp: string
): RelatedFieldOperation | null => {
  if (!exp.startsWith('data.')) {
    return null;
  }

  const value = exp.substring(5).trim();
  const relationNameEnd = value.indexOf('(');
  if (relationNameEnd < 1) {
    return null;
  }

  const relation = value.substring(0, relationNameEnd).trim();
  let depth = 0;
  let stringType: 'NONE' | 'SINGLE' | 'DOUBLE' = 'NONE';
  let closingIndex = -1;

  for (let i = relationNameEnd; i < value.length; i++) {
    switch (value[i]) {
      case '(': {
        if (stringType === 'NONE') {
          depth++;
        }
        break;
      }
      case ')': {
        if (stringType === 'NONE') {
          depth--;
          if (depth === 0) {
            closingIndex = i;
          }
        }
        break;
      }
      case '"': {
        if (stringType === 'DOUBLE') stringType = 'NONE';
        else if (stringType === 'NONE') stringType = 'DOUBLE';
        break;
      }
      case "'": {
        if (stringType === 'SINGLE') stringType = 'NONE';
        else if (stringType === 'NONE') stringType = 'SINGLE';
        break;
      }
      default:
        break;
    }

    if (closingIndex > -1) {
      break;
    }
  }

  if (closingIndex < 0) {
    throw new Error(`Invalid related selector syntax: ${exp}`);
  }

  const remaining = value.substring(closingIndex + 1).trim();
  if (!remaining.startsWith('.')) {
    return null;
  }

  const field = remaining.substring(1).trim();
  if (!relation || !field || field.includes('.')) {
    throw new Error(`Invalid related selector syntax: ${exp}`);
  }

  const rawArgs = value.substring(relationNameEnd + 1, closingIndex).trim();
  const args = rawArgs ? JSON5.parse(`{${rawArgs}}`) : {};
  const allowedArgs = ['first', 'sortField', 'sortOrder', 'filter'];
  const invalidArgs = Object.keys(args).filter(
    (key) => !allowedArgs.includes(key)
  );

  if (invalidArgs.length > 0) {
    throw new Error(
      `Invalid related selector arguments: ${invalidArgs.join(', ')}`
    );
  }

  const first = args.first ?? 1;
  if (first !== 1) {
    throw new Error('Related selector only supports first: 1');
  }

  const sortOrder = args.sortOrder
    ? (String(args.sortOrder).toLowerCase() as 'asc' | 'desc')
    : undefined;
  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    throw new Error(`Invalid sortOrder: ${args.sortOrder}`);
  }

  return {
    operation: 'relatedField',
    relation,
    field,
    first: 1,
    ...(args.sortField ? { sortField: String(args.sortField) } : {}),
    ...(sortOrder ? { sortOrder } : {}),
    ...(args.filter ? { filter: args.filter } : {}),
  };
};

/**
 * Parses a string into an operator.
 *
 * @param exp The expression to parse
 * @returns The parsed operator
 */
const solveExp = (exp: string): Operator => {
  if (!exp.startsWith('{{')) {
    let value: boolean | number | string = exp;

    if (
      (exp.startsWith('"') && exp.endsWith('"')) ||
      (exp.startsWith("'") && exp.endsWith("'"))
    ) {
      value = exp.substring(1, exp.length - 1);
    } else if (!isNaN(Number(exp))) {
      value = Number(exp);
    } else if (exp === 'true') {
      value = true;
    } else if (exp === 'false') {
      value = false;
    } else if (exp === 'null') {
      value = null;
    } else {
      throw new Error(`Unexpected operator: ${exp}`);
    }

    return {
      type: 'const',
      value,
    } as Operator;
  }

  if (!exp.endsWith('}}')) {
    throw new Error(`Invalid operation: ${exp}`);
  }
  exp = exp.substring(2, exp.length - 2).trim();

  if (exp.startsWith('data.')) {
    const relatedFieldOperation = getRelatedFieldOperation(exp);
    if (relatedFieldOperation) {
      return {
        type: 'expression',
        value: relatedFieldOperation,
      };
    }

    return {
      type: 'field',
      value: parseFieldReference(exp.substring(5)),
    };
  }

  if (exp.startsWith('info.')) {
    return {
      type: 'info',
      value: exp.substring(5),
    };
  }

  if (exp.startsWith('calc.')) {
    const operation = exp.split('(')[0].split('.')[1].trim() as any;
    if (!AVAILABLE_OPERATIONS.includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`);
    }

    const expectedNumOfArgs = getExpectedNumberOfArgs(operation);
    const args = getArgs(exp.substring(exp.indexOf('(') + 1, exp.length - 1));

    if (
      args.length > expectedNumOfArgs.max ||
      args.length < expectedNumOfArgs.min
    ) {
      throw new Error(
        `Invalid number of arguments for operation ${operation}: ${args.length}. Expected ${expectedNumOfArgs.min} to ${expectedNumOfArgs.max}`
      );
    }

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
 * Parses an expression string into its root operator.
 *
 * @param expression The raw expression string
 * @returns The parsed root operator
 */
export const getOperatorFromString = (expression: string): Operator => {
  return solveExp(expression.trim());
};

/**
 * Transforms an operation expression into the root parsed structure.
 *
 * @param expression The operation expression of the calculated field in string format
 * @returns The parsed expression root
 */
export const getExpressionFromString = (
  expression: string
): ParsedCalculatedExpression => {
  const parsedExpression = solveExp(expression.trim());

  if (parsedExpression.type === 'expression') {
    return parsedExpression.value as Operation;
  }

  return parsedExpression;
};
