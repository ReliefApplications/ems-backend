import { flattenDeep } from 'lodash';
import {
  DateOperationTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  SingleOperatorOperationsTypes,
} from '../../const/derivedFields';
import { getDefinitionFromString } from './definitionFromString';

type Dependency = {
  operation: Operation;
  path: string;
};

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
};

/**
 * Creates the pipeline stage for an operation with a single operator
 *
 * @param operation The operation to resolve
 * @param operator The operator for the operation
 * @param path The current path in the recursion
 * @returns The stage for the operation and an array with dependencies for the operation
 */
const resolveSingleOperator = (
  operation: SingleOperatorOperationsTypes,
  operator: Operator,
  path: string
) => {
  const dependencies: Dependency[] = [];

  const getValueString = () => {
    if (operator.type === 'value') return operator.value;
    if (operator.type === 'field') return `$data.${operator.value}`;

    // if is an expression, add to dependencies array,
    // that will be resolved before, since will be appended
    // to the beggining of the pipeline
    const auxPath = `${path}-${operation}`;
    dependencies.unshift({
      operation: operator.value as Operation,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };
  const step =
    operation === 'exists' || operation === 'size'
      ? {
          $addFields: {
            [path.startsWith('aux.') ? path : `data.${path}`]: {
              [operationMap[operation]]: getValueString(),
            },
          },
        }
      : // Date operations
        {
          $addFields: {
            [path.startsWith('aux.') ? path : `data.${path}`]: {
              $getField: {
                field: operation,
                input: {
                  $dateToParts: {
                    date: {
                      $toDate: getValueString(),
                    },
                  },
                },
              },
            },
          },
        };

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
    if (selectedOperator.type === 'value') return selectedOperator.value;
    if (selectedOperator.type === 'field')
      return `$data.${selectedOperator.value}`;

    // if is an expression, add to dependencies array,
    // that will be resolved before, since will be appended
    // to the beggining of the pipeline
    const auxPath = `${path}-${operation}`;
    dependencies.unshift({
      operation: selectedOperator.value as Operation,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  const step =
    operation !== 'datediff'
      ? {
          $addFields: {
            [path.startsWith('aux.') ? path : `data.${path}`]: {
              [operationMap[operation]]: [getValueString(1), getValueString(2)],
            },
          },
        }
      : // Date diff operation (always in minutes, can be converted to other units in the display options)
        {
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

  const step = {
    $addFields: {
      [path.startsWith('aux.') ? path : `data.${path}`]: {
        [operationMap[operation]]: operators.map((operator, index) => {
          if (operator.type === 'value') return operator.value;

          if (operator.type === 'field') return `$data.${operator.value}`;

          // if is an expression, add to dependencies array,
          // that will be resolved before, since will be appended
          // to the beggining of the pipeline
          const auxPath = `${path}-${operation}${index}`;

          dependencies.unshift({
            operation: operator.value as Operation,
            path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
          });
          return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
        }),
      },
    },
  };

  return { step, dependencies };
};

/**
 * Gets the pipeline for a derived field from its operation definition
 *
 * @param definition The operation definition of the derived field
 * @param path The current path in the recursion
 * @returns The pipeline for the derived field
 */
const buildPipeline = (definition: Operation, path: string): any[] => {
  const pipeline: any[] = [];
  switch (definition.operation) {
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
    case 'concat': {
      const { step, dependencies } = resolveMultipleOperators(
        definition.operation,
        definition.operators,
        path
      );

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`)
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
    case 'datediff': {
      const { step, dependencies } = resolveDoubleOperator(
        definition.operation,
        definition.operator1,
        definition.operator2,
        path
      );

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`)
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
    case 'exists':
    case 'size': {
      const { step, dependencies } = resolveSingleOperator(
        definition.operation,
        definition.operator,
        path
      );

      if (dependencies.length > 0)
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dep) =>
              buildPipeline(dep.operation, `aux.${dep.path}`)
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
 * Gets the pipeline for a derived field from its operation definition
 *
 * @param definition The operation definition of the derived field
 * @param name The name of the derived field
 * @returns The pipeline for the derived field
 */
const buildDerivedFieldPipeline = (definition: string, name: string): any[] => {
  const operation = getDefinitionFromString(definition);
  return buildPipeline(operation, name);
};

export default buildDerivedFieldPipeline;
