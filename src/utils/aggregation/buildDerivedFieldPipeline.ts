import { flattenDeep } from 'lodash';
import {
  // DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  // SingleOperatorOperationsTypes,
} from '../../const/derivedFields';

/**
 * Maps each operation to its corresponding pipeline command name
 */
const multipleOperationMap: {
  [key in MultipleOperatorsOperationsTypes]: string;
} = {
  add: '$add',
  mul: '$multiply',
  and: '$and',
  or: '$or',
  concat: '$concat',
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
  const dependencies: {
    operation: Operation;
    path: string;
  }[] = [];
  const step = {
    $addFields: {
      [path.startsWith('aux.') ? path : `data.${path}`]: {
        [multipleOperationMap[operation]]: operators.map((operator, index) => {
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
    case 'concat':
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
    case 'sub':
    case 'div':
    case 'gte':
    case 'gt':
    case 'lte':
    case 'lt':
    case 'eq':
    case 'ne':
    case 'datediff':
    // return resolveDoubleOperators(
    //   definition.operation,
    //   definition.operator1,
    //   definition.operator2,
    //   path
    // );
    case 'year':
    case 'week':
    case 'month':
    case 'day':
    case 'hour':
    case 'minute':
    case 'second':
    case 'exists':
    case 'size':
    // return resolveSingleOperator(
    //   definition.operation,
    //   definition.operator,
    //   path
    // );
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
const buildDerivedFieldPipeline = (
  definition: Operation,
  name: string
): any[] => {
  return buildPipeline(definition, name);
};

export default buildDerivedFieldPipeline;
