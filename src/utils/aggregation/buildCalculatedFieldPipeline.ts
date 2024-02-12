import { flattenDeep, isNil } from 'lodash';
import {
  DateOperationTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  SingleOperatorOperationsTypes,
} from '../../const/calculatedFields';
import { getExpressionFromString } from './expressionFromString';
import { PipelineStage } from 'mongoose';

type Dependency = {
  operation: Operation;
  path: string;
};

/** Special date operators enum */
enum infoOperators {
  UPDATED_AT = 'updatedAt',
  CREATED_AT = 'createdAt',
  ID = 'incrementalId',
}

/** Maps each operation to its corresponding pipeline command name */
const operationMap: {
  [key in Exclude<
    | MultipleOperatorsOperationsTypes
    | DoubleOperatorOperationsTypes
    | SingleOperatorOperationsTypes,
    DateOperationTypes
  >]: string;
} = {
  exists: '$toBool',
  size: '$size',
  date: '$toDate',
  sub: '$subtract',
  div: '$divide',
  gte: '$gte',
  gt: '$gt',
  lte: '$lte',
  lt: '$lt',
  eq: '$eq',
  ne: '$ne',
  datediff: '$dateDiff',
  add: '$add',
  mul: '$multiply',
  and: '$and',
  or: '$or',
  concat: '$concat',
  if: '$cond',
  substr: '$substr',
  toInt: '$toInt',
  toLong: '$toLong',
  includes: '$in',
  length: '$size',
  trim: '$trim',
};

/**
 * If provided a simple operator, returns the value, otherwise returns null
 *
 * @param operator The operator to get value from
 * @returns The value of the operator, or null if it is not a simple operator
 */
const getSimpleOperatorValue = (operator: Operator) => {
  if (operator.type === 'const') return operator.value;
  if (operator.type === 'field') return `$data.${operator.value}`;
  if (operator.type === 'info') {
    if (operator.value === infoOperators.CREATED_AT) return '$createdAt';
    if (operator.value === infoOperators.UPDATED_AT) return '$modifiedAt';
    if (operator.value === infoOperators.ID) return '$incrementalId';
  }
  return null;
};

/**
 * Creates the pipeline stage for a 'today' operation
 *
 * @param operator The operator for the operation, if any
 * @param path The current path in the recursion
 * @returns The stage for the operation and an array with dependencies for the operation
 */
const resolveTodayOperator = (operator: Operator | null, path: string) => {
  const dependencies: Dependency[] = [];

  const getValueString = () => {
    const value = getSimpleOperatorValue(operator);
    if (!isNil(value)) return value; // check that not null or undefined, so 0 works

    // if is an expression, add to dependencies array,
    // that will be resolved before, since will be appended
    // to the beginning of the pipeline
    const auxPath = `${path}-today`;
    dependencies.unshift({
      operation: operator.value as Operation,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  const step: PipelineStage = {
    $addFields: {
      [path.startsWith('aux.') ? path : `data.${path}`]: operator
        ? {
            $add: ['$$NOW', { $multiply: [getValueString(), 86400000] }],
          }
        : '$$NOW',
    },
  };

  return { step, dependencies };
};

/**
 * Creates the pipeline stage for an operation with a single operator
 *
 * @param operation The operation to resolve
 * @param operator The operator for the operation
 * @param path The current path in the recursion
 * @param timeZone the current timezone of the user
 * @returns The stage for the operation and an array with dependencies for the operation
 */
const resolveSingleOperator = (
  operation: SingleOperatorOperationsTypes,
  operator: Operator,
  path: string,
  timeZone: string
) => {
  const dependencies: Dependency[] = [];

  const getValueString = () => {
    const value = getSimpleOperatorValue(operator);
    if (!isNil(value)) return value; // check that not null or undefined, so 0 works

    // if is an expression, add to dependencies array,
    // that will be resolved before, since will be appended
    // to the beginning of the pipeline
    const auxPath = `${path}-${operation}`;
    dependencies.unshift({
      operation: operator.value as Operation,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  let step: PipelineStage = null;

  switch (operation) {
    case 'exists':
    case 'length':
    case 'trim':
    case 'toInt':
    case 'toLong': {
      // Simple operations
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            [operationMap[operation]]: getValueString(),
          },
        },
      };
      break;
    }
    case 'size': {
      // Size operation
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            [operationMap[operation]]: {
              $cond: {
                if: { $isArray: getValueString() },
                then: getValueString(),
                else: [],
              },
            },
          },
        },
      };
      break;
    }
    case 'date': {
      // To date operation
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            [operationMap[operation]]: {
              $convert: {
                input: getValueString(),
                to: 'date',
                onError: null,
                onNull: null,
              },
            },
          },
        },
      };
      break;
    }
    case 'year':
    case 'month':
    case 'day':
    case 'hour':
    case 'minute':
    case 'second':
    case 'millisecond': {
      // Date operations
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            $getField: {
              field: operation,
              input: {
                $dateToParts: {
                  date: {
                    $toDate: getValueString(),
                  },
                  timezone: timeZone,
                },
              },
            },
          },
        },
      };
      break;
    }
    default: {
      throw new Error(`Invalid operation: ${operation}`);
    }
  }

  return { step, dependencies };
};

/**
 * Creates the pipeline stage for an operation with a single operator
 *
 * @param operation The operation to resolve
 * @param operator1 The first operator for the operation
 * @param operator2 The second operator for the operation
 * @param path The current path in the recursion
 * @returns The stage for the operation and an array with dependencies for the operation
 */
const resolveDoubleOperator = (
  operation: DoubleOperatorOperationsTypes,
  operator1: Operator,
  operator2: Operator,
  path: string
) => {
  const dependencies: Dependency[] = [];

  const getValueString = (i: number) => {
    const selectedOperator = i === 1 ? operator1 : operator2;
    const value = getSimpleOperatorValue(selectedOperator);
    if (!isNil(value)) return value; // check that not null or undefined, so 0 works

    // if is an expression, add to dependencies array,
    // that will be resolved before, since will be appended
    // to the beginning of the pipeline
    const auxPath = `${path}-${operation}${i}`;
    dependencies.unshift({
      operation: selectedOperator.value as Operation,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  let step: PipelineStage = null;

  switch (operation) {
    case 'datediff':
      // Date diff operation (always in minutes, can be converted to other units in the display options)
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            $dateDiff: {
              startDate: { $toDate: getValueString(1) },
              endDate: { $toDate: getValueString(2) },
              unit: 'minute',
            },
          },
        },
      };
      break;
    case 'includes':
      // Includes operation

      // Add check if the value is an array, if not, evaluate to false
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            $cond: {
              if: { $isArray: getValueString(1) },
              then: {
                $in: [getValueString(2), getValueString(1)],
              },
              else: false,
            },
          },
        },
      };
      break;
    default:
      // Simple operations
      step = {
        $addFields: {
          [path.startsWith('aux.') ? path : `data.${path}`]: {
            [operationMap[operation]]: [getValueString(1), getValueString(2)],
          },
        },
      };
  }

  return { step, dependencies };
};

/**
 * Creates the pipeline stage for an operation with multiple operators
 *
 * @param operation The operation to resolve
 * @param operators The operators for the operation
 * @param path The current path in the recursion
 * @returns The stage for the operation and an array with dependencies for the operation
 */
const resolveMultipleOperators = (
  operation: MultipleOperatorsOperationsTypes,
  operators: Operator[],
  path: string
) => {
  const dependencies: Dependency[] = [];

  const step: PipelineStage = {
    $addFields: {
      [path.startsWith('aux.') ? path : `data.${path}`]: {
        [operationMap[operation]]: operators.map((operator, index) => {
          let value = getSimpleOperatorValue(operator);

          if (value === null) {
            // if is an expression, add to dependencies array,
            // that will be resolved before, since will be appended
            // to the beginning of the pipeline
            const auxPath = `${path}-${operation}${index}`;
            value = `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
            dependencies.unshift({
              operation: operator.value as Operation,
              path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
            });
          }

          switch (operation) {
            case 'concat': {
              // converts the value to a string (checks for date) if the operation is concat
              if (typeof value === 'string' && value.startsWith('$')) {
                return {
                  $cond: {
                    if: { $eq: [{ $type: value }, 'date'] },
                    then: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: value,
                      },
                    },
                    else: {
                      $convert: {
                        input: value,
                        to: 'string',
                        onError: '',
                        onNull: '',
                      },
                    },
                  },
                };
              } else {
                return {
                  $convert: {
                    input: value,
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                };
              }
            }
            default: {
              return value;
            }
          }
        }),
      },
    },
  };

  return { step, dependencies };
};

/**
 * Gets the pipeline for a calculated field from its operation
 *
 * @param op The operation that results in the calculated field
 * @param path The current path in the recursion
 * @param timeZone the current timezone of the user
 * @returns The pipeline for the calculated field
 */
const buildPipeline = (op: Operation, path: string, timeZone: string) => {
  const pipeline: PipelineStage.AddFields[] = [];
  switch (op.operation) {
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
    case 'if':
    case 'substr':
    case 'concat': {
      const { step, dependencies } = resolveMultipleOperators(
        op.operation,
        op.operators,
        path
      );

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`, timeZone)
            )
          )
        );
      pipeline.push(step);
      break;
    }
    case 'sub':
    case 'div':
    case 'gte':
    case 'gt':
    case 'lte':
    case 'lt':
    case 'eq':
    case 'ne':
    case 'datediff':
    case 'includes': {
      const { step, dependencies } = resolveDoubleOperator(
        op.operation,
        op.operator1,
        op.operator2,
        path
      );

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`, timeZone)
            )
          )
        );
      pipeline.push(step);
      break;
    }
    case 'year':
    case 'month':
    case 'day':
    case 'hour':
    case 'minute':
    case 'second':
    case 'millisecond':
    case 'date':
    case 'exists':
    case 'size':
    case 'length':
    case 'trim':
    case 'toInt':
    case 'toLong': {
      const { step, dependencies } = resolveSingleOperator(
        op.operation,
        op.operator,
        path,
        timeZone
      );
      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`, timeZone)
            )
          )
        );
      pipeline.push(step);
      break;
    }
    case 'today': {
      const { step, dependencies } = resolveTodayOperator(op.operator, path);

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`, timeZone)
            )
          )
        );
      pipeline.push(step);
      break;
    }
  }

  return pipeline;
};

/**
 * Gets the pipeline for a calculated field from its operation expression
 *
 * @param expression The operation expression of the calculated field
 * @param name The name of the calculated field
 * @param timeZone the current timezone of the user
 * @returns The pipeline for the calculated field
 */
const buildCalculatedFieldPipeline = (
  expression: string,
  name: string,
  timeZone: string
) => {
  const operation = getExpressionFromString(expression);
  const pipeline = buildPipeline(operation, name, timeZone);
  return pipeline;
};

export default buildCalculatedFieldPipeline;
