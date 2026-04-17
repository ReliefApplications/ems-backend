import { MULTISELECT_TYPES } from '@const/fieldTypes';
import { ReferenceData } from '@models';
import { getFullChoices } from '@utils/form/getDisplayText';
import { flattenDeep } from 'lodash';
import { PipelineStage } from 'mongoose';
import {
  DateOperationTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  SingleOperatorOperationsTypes,
} from '../../const/calculatedFields';
import {
  getExpressionFromString,
  getOperatorFromString,
} from './expressionFromString';

type Dependency = {
  operation: Operation;
  path: string;
};

type FieldTextPaths = Record<string, string>;

type BuildCalculatedFieldPipelineOptions = {
  fields?: any[];
  context?: any;
};

type DisplayTextStage = {
  fieldPath: string;
  targetPath: string;
  step: PipelineStage.AddFields;
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
};

/**
 * Checks whether an operator is an expression.
 *
 * @param operator Operator to check
 * @returns Whether the operator is an expression
 */
const isExpressionOperator = (
  operator: Operator | null
): operator is Extract<Operator, { type: 'expression' }> =>
  Boolean(operator && operator.type === 'expression');

/**
 * If provided a simple operator, returns the value, otherwise returns null.
 *
 * @param operator The operator to get value from
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The value of the operator, or null if it is not a simple operator
 */
const getSimpleOperatorValue = (
  operator: Operator | null,
  fieldTextPaths: FieldTextPaths = {}
) => {
  if (!operator) return null;

  if (operator.type === 'const') return operator.value;

  if (operator.type === 'field') {
    const fieldPath = operator.value.field;

    if (operator.value.display === 'text' && fieldTextPaths[fieldPath]) {
      return `$${fieldTextPaths[fieldPath]}`;
    }

    return `$data.${fieldPath}`;
  }

  if (operator.type === 'info') {
    if (operator.value === infoOperators.CREATED_AT) return '$createdAt';
    if (operator.value === infoOperators.UPDATED_AT) return '$modifiedAt';
    if (operator.value === infoOperators.ID) return '$incrementalId';
  }

  return null;
};

/**
 * Collects all field paths referenced with the `:text` modifier in an operation.
 *
 * @param operation Operation to inspect
 * @param displayFields Mutable set of discovered field paths
 * @returns Discovered field paths
 */
const collectDisplayTextFieldPaths = (
  operation: Operation,
  displayFields = new Set<string>()
) => {
  const collectOperator = (operator: Operator | null) => {
    if (!operator) return;

    if (operator.type === 'field' && operator.value.display === 'text') {
      displayFields.add(operator.value.field);
      return;
    }

    if (isExpressionOperator(operator)) {
      collectDisplayTextFieldPaths(operator.value, displayFields);
    }
  };

  switch (operation.operation) {
    case 'today': {
      collectOperator(operation.operator);
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
    case 'toInt':
    case 'toLong': {
      collectOperator(operation.operator);
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
      collectOperator(operation.operator1);
      collectOperator(operation.operator2);
      break;
    }
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
    case 'if':
    case 'substr':
    case 'concat': {
      operation.operators.forEach((operator) => collectOperator(operator));
      break;
    }
  }

  return displayFields;
};

/**
 * Collects `:text` field references from a root operator.
 *
 * @param operator Root operator
 * @param displayFields Mutable set of discovered field paths
 * @returns Discovered field paths
 */
const collectDisplayTextFieldPathsFromOperator = (
  operator: Operator,
  displayFields = new Set<string>()
) => {
  if (operator.type === 'field' && operator.value.display === 'text') {
    displayFields.add(operator.value.field);
    return displayFields;
  }

  if (isExpressionOperator(operator)) {
    return collectDisplayTextFieldPaths(operator.value, displayFields);
  }

  return displayFields;
};

/**
 * Gets a field definition from the available fields list.
 *
 * @param fieldPath Field path referenced in the expression
 * @param fields Available fields
 * @returns Matching field definition, if any
 */
const getFieldDefinition = (fieldPath: string, fields: any[]) => {
  const [fieldName] = fieldPath.split('.');
  return fields.find((field) => field?.name === fieldName);
};

/**
 * Extracts the comparable value from a choice item.
 *
 * @param choice Choice definition
 * @returns Choice value
 */
const getChoiceValue = (choice: any) =>
  typeof choice === 'object' && choice !== null && 'value' in choice
    ? choice.value
    : choice;

/**
 * Extracts the text value from a choice item.
 *
 * @param choice Choice definition
 * @returns Choice text
 */
const getChoiceText = (choice: any) =>
  typeof choice === 'object' && choice !== null && 'text' in choice
    ? choice.text
    : choice;

/**
 * Resolves the field used to compare a stored non-primitive value with its
 * corresponding choice value.
 *
 * @param field Field definition
 * @returns Comparable field name, when applicable
 */
const getComparableValueField = async (field: any): Promise<string | null> => {
  if (!field?.referenceData?.id) {
    return null;
  }

  try {
    const referenceData = await ReferenceData.findById(field.referenceData.id)
      .select('valueField')
      .lean();

    return referenceData?.valueField || null;
  } catch {
    return null;
  }
};

/**
 * Builds a Mongo expression that extracts the primitive comparable value from a
 * stored select/tagbox value.
 *
 * @param sourcePath Source value path
 * @param comparableField Optional reference-data comparable field
 * @returns Mongo expression resolving the comparable value
 */
const buildComparableValueExpression = (
  sourcePath: string,
  comparableField?: string | null
) => {
  const wrappedValuePath = `${sourcePath}.value`;

  if (!comparableField) {
    return {
      $ifNull: [wrappedValuePath, sourcePath],
    };
  }

  return {
    $ifNull: [
      `${wrappedValuePath}.${comparableField}`,
      {
        $ifNull: [
          `${sourcePath}.${comparableField}`,
          {
            $ifNull: [wrappedValuePath, sourcePath],
          },
        ],
      },
    ],
  };
};

/**
 * Builds an auxiliary stage that resolves the display text for a field.
 *
 * @param fieldPath Expression field path
 * @param fields Available fields
 * @param context Request context
 * @returns Display text stage information
 */
const buildDisplayTextStage = async (
  fieldPath: string,
  fields: any[],
  context: any
): Promise<DisplayTextStage | null> => {
  const field = getFieldDefinition(fieldPath, fields);
  if (
    !field ||
    !(
      field.choices ||
      field.choicesByUrl ||
      field.choicesByGraphQL ||
      field.referenceData
    )
  ) {
    return null;
  }

  const choices = (await getFullChoices(field, context)) || [];
  if (!choices.length) {
    return null;
  }

  const comparableField = await getComparableValueField(field);
  const choiceValues = choices.map((choice) => getChoiceValue(choice));
  const choiceTexts = choices.map((choice) => getChoiceText(choice));
  const targetPath = `aux.displayText.${fieldPath}`;
  const sourcePath = `$data.${fieldPath}`;
  const normalizedSourceValue = buildComparableValueExpression(
    sourcePath,
    comparableField
  );

  if (MULTISELECT_TYPES.includes(field.type)) {
    return {
      fieldPath,
      targetPath,
      step: {
        $addFields: {
          [targetPath]: {
            $cond: {
              if: { $isArray: sourcePath },
              then: {
                $map: {
                  input: sourcePath,
                  as: 'selectedValue',
                  in: {
                    $let: {
                      vars: {
                        choiceValues,
                        choiceTexts,
                        normalizedSelectedValue: buildComparableValueExpression(
                          '$$selectedValue',
                          comparableField
                        ),
                      },
                      in: {
                        $let: {
                          vars: {
                            choiceIndex: {
                              $indexOfArray: [
                                '$$choiceValues',
                                '$$normalizedSelectedValue',
                              ],
                            },
                          },
                          in: {
                            $cond: {
                              if: { $eq: ['$$choiceIndex', -1] },
                              then: '$$normalizedSelectedValue',
                              else: {
                                $arrayElemAt: [
                                  '$$choiceTexts',
                                  '$$choiceIndex',
                                ],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              else: normalizedSourceValue,
            },
          },
        },
      },
    };
  }

  return {
    fieldPath,
    targetPath,
    step: {
      $addFields: {
        [targetPath]: {
          $let: {
            vars: {
              choiceValues,
              choiceTexts,
              normalizedValue: normalizedSourceValue,
            },
            in: {
              $let: {
                vars: {
                  choiceIndex: {
                    $indexOfArray: ['$$choiceValues', '$$normalizedValue'],
                  },
                },
                in: {
                  $cond: {
                    if: { $eq: ['$$choiceIndex', -1] },
                    then: '$$normalizedValue',
                    else: {
                      $arrayElemAt: ['$$choiceTexts', '$$choiceIndex'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};

/**
 * Builds all auxiliary stages required for `:text` field references.
 *
 * @param operation Parsed calculated-field operation
 * @param fields Available fields
 * @param context Request context
 * @returns Auxiliary stages and their corresponding field-path mapping
 */
const buildDisplayTextStages = async (
  operation: Operation,
  fields: any[] = [],
  context?: any
) => {
  const displayFieldPaths = Array.from(collectDisplayTextFieldPaths(operation));

  if (displayFieldPaths.length === 0 || fields.length === 0) {
    return {
      stages: [] as PipelineStage.AddFields[],
      fieldTextPaths: {} as FieldTextPaths,
    };
  }

  const mappings = await Promise.all(
    displayFieldPaths.map((fieldPath) =>
      buildDisplayTextStage(fieldPath, fields, context)
    )
  );

  return mappings.reduce(
    (acc, mapping) => {
      if (!mapping) {
        return acc;
      }

      acc.stages.push(mapping.step);
      acc.fieldTextPaths[mapping.fieldPath] = mapping.targetPath;
      return acc;
    },
    {
      stages: [] as PipelineStage.AddFields[],
      fieldTextPaths: {} as FieldTextPaths,
    }
  );
};

/**
 * Builds auxiliary stages required for `:text` references found on a root
 * operator, including direct `{{data.field:text}}` expressions.
 *
 * @param operator Root parsed operator
 * @param fields Available fields
 * @param context Request context
 * @returns Auxiliary stages and their corresponding field-path mapping
 */
const buildDisplayTextStagesFromOperator = async (
  operator: Operator,
  fields: any[] = [],
  context?: any
) => {
  if (isExpressionOperator(operator)) {
    return buildDisplayTextStages(operator.value, fields, context);
  }

  const displayFieldPaths = Array.from(
    collectDisplayTextFieldPathsFromOperator(operator)
  );

  if (displayFieldPaths.length === 0 || fields.length === 0) {
    return {
      stages: [] as PipelineStage.AddFields[],
      fieldTextPaths: {} as FieldTextPaths,
    };
  }

  const mappings = await Promise.all(
    displayFieldPaths.map((fieldPath) =>
      buildDisplayTextStage(fieldPath, fields, context)
    )
  );

  return mappings.reduce(
    (acc, mapping) => {
      if (!mapping) {
        return acc;
      }

      acc.stages.push(mapping.step);
      acc.fieldTextPaths[mapping.fieldPath] = mapping.targetPath;
      return acc;
    },
    {
      stages: [] as PipelineStage.AddFields[],
      fieldTextPaths: {} as FieldTextPaths,
    }
  );
};

/**
 * Creates the pipeline stage for a 'today' operation.
 *
 * @param operator The operator for the operation, if any
 * @param path The current path in the recursion
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The stage for the operation and an array with dependencies
 */
const resolveTodayOperator = (
  operator: Operator | null,
  path: string,
  fieldTextPaths: FieldTextPaths
) => {
  const dependencies: Dependency[] = [];

  const getValueString = () => {
    if (!operator) return null;

    if (!isExpressionOperator(operator)) {
      return getSimpleOperatorValue(operator, fieldTextPaths);
    }

    const auxPath = `${path}-today`;
    dependencies.unshift({
      operation: operator.value,
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
 * Creates the pipeline stage for an operation with a single operator.
 *
 * @param operation The operation to resolve
 * @param operator The operator for the operation
 * @param path The current path in the recursion
 * @param timeZone the current timezone of the user
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The stage for the operation and an array with dependencies
 */
const resolveSingleOperator = (
  operation: SingleOperatorOperationsTypes,
  operator: Operator,
  path: string,
  timeZone: string,
  fieldTextPaths: FieldTextPaths
) => {
  const dependencies: Dependency[] = [];

  const getValueString = () => {
    if (!isExpressionOperator(operator)) {
      return getSimpleOperatorValue(operator, fieldTextPaths);
    }

    const auxPath = `${path}-${operation}`;
    dependencies.unshift({
      operation: operator.value,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });
    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  let step: PipelineStage = null;

  switch (operation) {
    case 'exists':
    case 'toInt':
    case 'toLong': {
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
 * Creates the pipeline stage for an operation with two operators.
 *
 * @param operation The operation to resolve
 * @param operator1 The first operator for the operation
 * @param operator2 The second operator for the operation
 * @param path The current path in the recursion
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The stage for the operation and an array with dependencies
 */
const resolveDoubleOperator = (
  operation: DoubleOperatorOperationsTypes,
  operator1: Operator,
  operator2: Operator,
  path: string,
  fieldTextPaths: FieldTextPaths
) => {
  const dependencies: Dependency[] = [];

  const getValueString = (i: number) => {
    const selectedOperator = i === 1 ? operator1 : operator2;

    if (!isExpressionOperator(selectedOperator)) {
      return getSimpleOperatorValue(selectedOperator, fieldTextPaths);
    }

    const auxPath = `${path}-${operation}${i}`;
    dependencies.unshift({
      operation: selectedOperator.value,
      path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
    });

    return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
  };

  let step: PipelineStage = null;

  switch (operation) {
    case 'datediff':
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
 * Creates the pipeline stage for an operation with multiple operators.
 *
 * @param operation The operation to resolve
 * @param operators The operators for the operation
 * @param path The current path in the recursion
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The stage for the operation and an array with dependencies
 */
const resolveMultipleOperators = (
  operation: MultipleOperatorsOperationsTypes,
  operators: Operator[],
  path: string,
  fieldTextPaths: FieldTextPaths
) => {
  const dependencies: Dependency[] = [];

  const step: PipelineStage = {
    $addFields: {
      [path.startsWith('aux.') ? path : `data.${path}`]: {
        [operationMap[operation]]: operators.map((operator, index) => {
          let value = getSimpleOperatorValue(operator, fieldTextPaths);

          if (isExpressionOperator(operator)) {
            const auxPath = `${path}-${operation}${index}`;
            value = `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
            dependencies.unshift({
              operation: operator.value,
              path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
            });
          }

          switch (operation) {
            case 'concat': {
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
              }

              return {
                $convert: {
                  input: value,
                  to: 'string',
                  onError: '',
                  onNull: '',
                },
              };
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
 * Gets the pipeline for a calculated field from its operation.
 *
 * @param operation The operation that results in the calculated field
 * @param path The current path in the recursion
 * @param timeZone the current timezone of the user
 * @param fieldTextPaths Pre-computed paths for `:text` field references
 * @returns The pipeline for the calculated field
 */
const buildPipeline = (
  operation: Operation,
  path: string,
  timeZone: string,
  fieldTextPaths: FieldTextPaths
) => {
  const pipeline: PipelineStage.AddFields[] = [];

  switch (operation.operation) {
    case 'add':
    case 'mul':
    case 'and':
    case 'or':
    case 'if':
    case 'substr':
    case 'concat': {
      const { step, dependencies } = resolveMultipleOperators(
        operation.operation,
        operation.operators,
        path,
        fieldTextPaths
      );

      if (dependencies.length > 0) {
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dependency) =>
              buildPipeline(
                dependency.operation,
                `aux.${dependency.path}`,
                timeZone,
                fieldTextPaths
              )
            )
          )
        );
      }

      pipeline.push(step as PipelineStage.AddFields);
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
        operation.operation,
        operation.operator1,
        operation.operator2,
        path,
        fieldTextPaths
      );

      if (dependencies.length > 0) {
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dependency) =>
              buildPipeline(
                dependency.operation,
                `aux.${dependency.path}`,
                timeZone,
                fieldTextPaths
              )
            )
          )
        );
      }

      pipeline.push(step as PipelineStage.AddFields);
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
    case 'toInt':
    case 'toLong': {
      const { step, dependencies } = resolveSingleOperator(
        operation.operation,
        operation.operator,
        path,
        timeZone,
        fieldTextPaths
      );

      if (dependencies.length > 0) {
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dependency) =>
              buildPipeline(
                dependency.operation,
                `aux.${dependency.path}`,
                timeZone,
                fieldTextPaths
              )
            )
          )
        );
      }

      pipeline.push(step as PipelineStage.AddFields);
      break;
    }
    case 'today': {
      const { step, dependencies } = resolveTodayOperator(
        operation.operator,
        path,
        fieldTextPaths
      );

      if (dependencies.length > 0) {
        pipeline.unshift(
          ...flattenDeep(
            dependencies.map((dependency) =>
              buildPipeline(
                dependency.operation,
                `aux.${dependency.path}`,
                timeZone,
                fieldTextPaths
              )
            )
          )
        );
      }

      pipeline.push(step as PipelineStage.AddFields);
      break;
    }
  }

  return pipeline;
};

/**
 * Gets the pipeline for a calculated field from its operation expression.
 *
 * @param expression The operation expression of the calculated field
 * @param name The name of the calculated field
 * @param timeZone the current timezone of the user
 * @param options Additional context required to resolve `:text` operators
 * @returns The pipeline for the calculated field
 */
const buildCalculatedFieldPipeline = async (
  expression: string,
  name: string,
  timeZone: string,
  options: BuildCalculatedFieldPipelineOptions = {}
) => {
  const rootOperator = getOperatorFromString(expression);
  const { stages, fieldTextPaths } = await buildDisplayTextStagesFromOperator(
    rootOperator,
    options.fields,
    options.context
  );

  if (!isExpressionOperator(rootOperator)) {
    return [
      ...stages,
      {
        $addFields: {
          [`data.${name}`]: getSimpleOperatorValue(
            rootOperator,
            fieldTextPaths
          ),
        },
      },
    ];
  }

  const operation = getExpressionFromString(expression);
  return [
    ...stages,
    ...buildPipeline(operation, name, timeZone, fieldTextPaths),
  ];
};

export default buildCalculatedFieldPipeline;
