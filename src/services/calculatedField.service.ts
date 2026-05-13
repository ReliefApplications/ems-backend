import { flattenDeep, isNil } from 'lodash';
import { PipelineStage } from 'mongoose';
import {
  DateOperationTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  SingleOperatorOperationsTypes,
} from '@const/calculatedFields';
import { referenceDataType } from '@const/enumTypes';
import { getExpressionFromString } from '@utils/aggregation/expressionFromString';
import { getFullChoices } from '@utils/form/getDisplayText';
import { ApiConfiguration, ReferenceData } from '@models';
import { CustomAPI } from '@server/apollo/dataSources';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';

/**
 * Minimal resource shape the service needs — just the field list, plus an
 * optional name for error messages. Accepts a full Resource document too.
 */
type ResourceLike = { fields: any[]; name?: string } | null;

type UserAttributes = Record<string, unknown>;

type Dependency = {
  operation: Operation;
  path: string;
};

/** Pre-fetched mapping of stored value → display label for a field */
type ChoiceMap = { value: any; text: any }[];

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
 * Service that compiles a calculated-field expression into a MongoDB aggregation pipeline.
 *
 * Async because `calc.displayValue(...)` may need to pre-fetch choice lists from
 * `choicesByUrl` / `choicesByGraphQL` / `referenceData` sources before the pipeline
 * can be assembled.
 */
export class CalculatedFieldService {
  /**
   * Build a CalculatedFieldService bound to the resource and request context.
   *
   * @param resource Resource the calculated field belongs to (needed to look up field defs for displayValue)
   * @param context GraphQL context (needed to fetch choices/refData via data sources)
   * @param timeZone User timezone, used by date operations
   * @param userAttributes Logged-in user contextual attributes for `{{user.X}}` placeholders
   */
  constructor(
    private resource: ResourceLike,
    private context: Context | null,
    private timeZone: string,
    private userAttributes: UserAttributes = {}
  ) {}

  /**
   * Compiles an expression to a pipeline. Async to allow pre-fetching choice lists
   * for any `calc.displayValue(...)` references found in the expression.
   *
   * @param expression Calculated-field expression in string form (e.g. `{{calc.add(1; 2)}}`)
   * @param name Target field name (result lands in `data.<name>`)
   * @returns Aggregation pipeline stages that produce the calculated value
   */
  async build(expression: string, name: string): Promise<PipelineStage[]> {
    const parsed = getExpressionFromString(expression);
    const referenced = new Set<string>();
    this.collectDisplayValueFields(parsed, referenced);
    const choiceMaps = await this.prefetchChoiceMaps(referenced);

    if (parsed.type === 'expression') {
      return this.buildPipeline(parsed.value, name, choiceMaps);
    }
    return [
      {
        $addFields: {
          [`data.${name}`]: this.getSimpleOperatorValue(parsed),
        },
      },
    ];
  }

  /**
   * Recursively collect every field name referenced by a `calc.displayValue(...)`
   * inside the expression so we can pre-fetch its choice list.
   *
   * @param op Operator subtree to walk
   * @param acc Accumulator set, mutated in place with the field names found
   */
  private collectDisplayValueFields(op: Operator, acc: Set<string>) {
    if (op.type !== 'expression') return;
    const operation = op.value;
    if (operation.operation === 'displayValue') {
      acc.add(operation.fieldName);
      return;
    }
    if ('operator' in operation && operation.operator)
      this.collectDisplayValueFields(operation.operator, acc);
    if ('operator1' in operation)
      this.collectDisplayValueFields(operation.operator1, acc);
    if ('operator2' in operation)
      this.collectDisplayValueFields(operation.operator2, acc);
    if ('operators' in operation)
      operation.operators.forEach((sub) =>
        this.collectDisplayValueFields(sub, acc)
      );
  }

  /**
   * Resolve each referenced field's choice list (value → text pairs) from its
   * source: static choices, choicesByUrl, choicesByGraphQL, or referenceData.
   * Unresolvable sources yield an empty map, which makes `displayValue` fall
   * back to the raw stored value at runtime.
   *
   * @param fieldNames Field names referenced by `calc.displayValue(...)`
   * @returns Map of field name → array of `{value, text}` pairs
   */
  private async prefetchChoiceMaps(
    fieldNames: Set<string>
  ): Promise<Record<string, ChoiceMap>> {
    if (fieldNames.size === 0) return {};
    const resource = this.resource;
    if (!resource)
      throw new Error(
        'CalculatedFieldService: a Resource is required to resolve calc.displayValue(...)'
      );

    const entries = await Promise.all(
      Array.from(fieldNames).map(async (name) => {
        const field = resource.fields.find((f: any) => f.name === name);
        if (!field)
          throw new Error(
            `calc.displayValue: unknown field "${name}" on resource ${
              resource.name ?? ''
            }`
          );
        return [name, await this.resolveChoiceMap(field)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  /**
   * Resolve a single field's choice list, normalising to `{value, text}` pairs.
   * Errors during fetch are logged and yield an empty map (graceful degradation).
   *
   * @param field Resource field definition
   * @returns Choice map for the field, or empty array if no source is configured
   */
  private async resolveChoiceMap(field: any): Promise<ChoiceMap> {
    try {
      if (field.referenceData?.id) {
        return await this.resolveReferenceDataMap(field);
      }
      if (field.choicesByUrl || field.choicesByGraphQL || field.choices) {
        const choices = await getFullChoices(field, this.context as any);
        return (choices || []).map((c: any) =>
          typeof c === 'string' || typeof c === 'number'
            ? { value: c, text: c }
            : { value: c.value, text: c.text?.default ?? c.text ?? c.value }
        );
      }
      return [];
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      return [];
    }
  }

  /**
   * Resolve a referenceData-backed field's choice list using its displayField.
   * Items are fetched from the configured API for non-static referenceData, or
   * read directly from the stored `data` array for static referenceData.
   *
   * @param field Resource field whose `referenceData.id` points to the source
   * @returns Choice map with `value` from `referenceData.valueField` and
   *   `text` from `field.referenceData.displayField`
   */
  private async resolveReferenceDataMap(field: any): Promise<ChoiceMap> {
    const referenceData = await ReferenceData.findById(field.referenceData.id);
    if (!referenceData) return [];

    let items: any[] = [];
    if (referenceData.type !== referenceDataType.static) {
      let apiConfiguration: any = referenceData.apiConfiguration;
      if (apiConfiguration && !apiConfiguration.name) {
        apiConfiguration = await ApiConfiguration.findById(apiConfiguration);
      }
      const dataSource = this.context?.dataSources?.[apiConfiguration?.name] as
        | CustomAPI
        | undefined;
      if (dataSource) {
        items = await dataSource.getReferenceDataItems(
          referenceData,
          apiConfiguration
        );
      }
    } else {
      items = referenceData.data || [];
    }

    const displayField =
      field.referenceData.displayField || referenceData.valueField;
    return items.map((item) => ({
      value: item[referenceData.valueField],
      text: item[displayField],
    }));
  }

  /**
   * Resolves a non-expression operator (const/field/info/user) to the value
   * the pipeline should use — a literal for constants and user attributes,
   * or a `$`-prefixed Mongo path for field/info references.
   *
   * @param operator A leaf operator (not an `expression` sub-tree)
   * @returns The literal value or Mongo path expression, or `null` for an
   *   unknown operator type
   */
  private getSimpleOperatorValue(
    operator: Exclude<Operator, { type: 'expression' }>
  ) {
    if (operator.type === 'const') return operator.value;
    if (operator.type === 'field') return `$data.${operator.value}`;
    if (operator.type === 'info') {
      if (operator.value === infoOperators.CREATED_AT) return '$createdAt';
      if (operator.value === infoOperators.UPDATED_AT) return '$modifiedAt';
      if (operator.value === infoOperators.ID) return '$incrementalId';
    }
    if (operator.type === 'user') {
      const value = this.userAttributes[operator.value as string];
      return isNil(value) ? '' : value;
    }
    return null;
  }

  /**
   * Build the `$addFields` stage for the `displayValue` operation, doing the
   * value → label lookup in Mongo using the pre-fetched choice map. Multi-select
   * arrays are mapped element-by-element; missing values fall back to the raw value.
   *
   * @param fieldName Source field whose stored value(s) should be resolved
   * @param path Target path in the pipeline (`data.<x>` or `aux.<x>`)
   * @param choiceMaps Pre-fetched maps keyed by field name
   * @returns A single `$addFields` stage performing the lookup
   */
  private buildDisplayValueStage(
    fieldName: string,
    path: string,
    choiceMaps: Record<string, ChoiceMap>
  ): PipelineStage.AddFields {
    const targetPath = path.startsWith('aux.') ? path : `data.${path}`;
    const stored = `$data.${fieldName}`;
    const map = choiceMaps[fieldName] || [];
    // Normalize to strings so a stored `4` matches a configured `"4"` (and vice versa)
    const values = map.map((m) => (isNil(m.value) ? m.value : String(m.value)));
    const texts = map.map((m) => m.text);

    // Mongo $let variable names must start with a lowercase letter — using a
    // `dv` (displayValue) prefix both satisfies that rule and namespaces them.
    const lookup = (input: any) => ({
      $let: {
        vars: {
          dvIdx: {
            $indexOfArray: [
              '$$dvValues',
              {
                $convert: { input, to: 'string', onError: input, onNull: null },
              },
            ],
          },
        },
        in: {
          $cond: {
            if: { $eq: ['$$dvIdx', -1] },
            then: input,
            else: { $arrayElemAt: ['$$dvTexts', '$$dvIdx'] },
          },
        },
      },
    });

    return {
      $addFields: {
        [targetPath]: {
          $let: {
            vars: { dvValues: values, dvTexts: texts },
            in: {
              $cond: {
                if: { $isArray: stored },
                then: {
                  $map: {
                    input: stored,
                    as: 'v',
                    in: lookup('$$v'),
                  },
                },
                else: lookup(stored),
              },
            },
          },
        },
      },
    };
  }

  /**
   * Build the `$addFields` stage for a `today` operation. With no operand it
   * emits `$$NOW`; with a numeric operand it offsets `$$NOW` by that many days.
   * If the operand is itself an expression, a dependency stage is queued so it
   * can be evaluated into an aux path first.
   *
   * @param operator Optional offset operand (a sub-expression or scalar)
   * @param path Target path (`data.<x>` or `aux.<x>`)
   * @returns The generated stage and any nested dependencies to emit first
   */
  private resolveTodayOperator(operator: Operator | null, path: string) {
    const dependencies: Dependency[] = [];

    const getValueString = () => {
      if (!operator) return null;
      if (operator.type !== 'expression')
        return this.getSimpleOperatorValue(operator);

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
  }

  /**
   * Build the `$addFields` stage for an operation that takes one operand
   * (`exists`, `size`, `date`, `toInt`, `toLong`, and the date-part extractors).
   * Nested expressions are queued as dependencies and replaced by aux-path refs.
   *
   * @param operation The single-operand operation to compile
   * @param operator The operand (scalar leaf or nested expression)
   * @param path Target path (`data.<x>` or `aux.<x>`)
   * @returns The generated stage and any nested dependencies to emit first
   */
  private resolveSingleOperator(
    operation: SingleOperatorOperationsTypes,
    operator: Operator,
    path: string
  ) {
    const dependencies: Dependency[] = [];

    const getValueString = () => {
      if (operator.type !== 'expression')
        return this.getSimpleOperatorValue(operator);

      const auxPath = `${path}-${operation}`;
      dependencies.unshift({
        operation: operator.value,
        path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
      });
      return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
    };

    let step: PipelineStage;

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
                    date: { $toDate: getValueString() },
                    timezone: this.timeZone,
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
  }

  /**
   * Build the `$addFields` stage for an operation that takes exactly two
   * operands (`sub`, `div`, comparisons, `datediff`, `includes`). Order matters
   * — operator1 is the left-hand side. Nested expressions are queued as
   * dependencies and referenced through aux paths.
   *
   * @param operation The two-operand operation to compile
   * @param operator1 Left operand
   * @param operator2 Right operand
   * @param path Target path (`data.<x>` or `aux.<x>`)
   * @returns The generated stage and any nested dependencies to emit first
   */
  private resolveDoubleOperator(
    operation: DoubleOperatorOperationsTypes,
    operator1: Operator,
    operator2: Operator,
    path: string
  ) {
    const dependencies: Dependency[] = [];

    const getValueString = (i: number) => {
      const selectedOperator = i === 1 ? operator1 : operator2;
      if (selectedOperator.type !== 'expression')
        return this.getSimpleOperatorValue(selectedOperator);

      const auxPath = `${path}-${operation}${i}`;
      dependencies.unshift({
        operation: selectedOperator.value,
        path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
      });
      return `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
    };

    let step: PipelineStage;

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
                then: { $in: [getValueString(2), getValueString(1)] },
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
  }

  /**
   * Build the `$addFields` stage for variadic operations (`add`, `mul`, `and`,
   * `or`, `if`, `substr`, `concat`). For `concat`, each operand is wrapped in a
   * `$convert` (or a date-aware `$cond` when the operand is a Mongo path) so
   * that mixed scalar / date inputs become strings. Nested expressions are
   * queued as dependencies and referenced through aux paths.
   *
   * @param operation The variadic operation to compile
   * @param operators Ordered list of operands
   * @param path Target path (`data.<x>` or `aux.<x>`)
   * @returns The generated stage and any nested dependencies to emit first
   */
  private resolveMultipleOperators(
    operation: MultipleOperatorsOperationsTypes,
    operators: Operator[],
    path: string
  ) {
    const dependencies: Dependency[] = [];

    const step: PipelineStage = {
      $addFields: {
        [path.startsWith('aux.') ? path : `data.${path}`]: {
          [operationMap[operation]]: operators.map((operator, index) => {
            let value: any;
            if (operator.type !== 'expression') {
              value = this.getSimpleOperatorValue(operator);
            } else {
              const auxPath = `${path}-${operation}${index}`;
              value = `$${auxPath.startsWith('aux.') ? '' : 'aux.'}${auxPath}`;
              dependencies.unshift({
                operation: operator.value,
                path: auxPath.startsWith('aux.') ? auxPath.slice(4) : auxPath,
              });
            }

            if (operation === 'concat') {
              // Concat must coerce to string and date-format date inputs
              if (typeof value === 'string' && value.startsWith('$')) {
                return {
                  $cond: {
                    if: { $eq: [{ $type: value }, 'date'] },
                    then: {
                      $dateToString: { format: '%Y-%m-%d', date: value },
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
            return value;
          }),
        },
      },
    };

    return { step, dependencies };
  }

  /**
   * Recursively compile a parsed operation into ordered `$addFields` stages.
   * Each branch resolves its top-level operator and prepends any aux-path
   * dependency stages so that downstream operators can reference their results.
   *
   * @param op Parsed operation to compile
   * @param path Target path for this operation's output (`data.<x>` or `aux.<x>`)
   * @param choiceMaps Pre-fetched choice maps consumed by `displayValue`
   * @returns Ordered list of `$addFields` stages
   */
  private buildPipeline(
    op: Operation,
    path: string,
    choiceMaps: Record<string, ChoiceMap>
  ): PipelineStage.AddFields[] {
    const pipeline: PipelineStage.AddFields[] = [];

    switch (op.operation) {
      case 'displayValue': {
        pipeline.push(
          this.buildDisplayValueStage(op.fieldName, path, choiceMaps)
        );
        break;
      }
      case 'add':
      case 'mul':
      case 'and':
      case 'or':
      case 'if':
      case 'substr':
      case 'concat': {
        const { step, dependencies } = this.resolveMultipleOperators(
          op.operation,
          op.operators,
          path
        );
        if (dependencies.length > 0)
          pipeline.unshift(
            ...flattenDeep(
              dependencies.map((dep) =>
                this.buildPipeline(dep.operation, `aux.${dep.path}`, choiceMaps)
              )
            )
          );
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
        const { step, dependencies } = this.resolveDoubleOperator(
          op.operation,
          op.operator1,
          op.operator2,
          path
        );
        if (dependencies.length > 0)
          pipeline.unshift(
            ...flattenDeep(
              dependencies.map((dep) =>
                this.buildPipeline(dep.operation, `aux.${dep.path}`, choiceMaps)
              )
            )
          );
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
        const { step, dependencies } = this.resolveSingleOperator(
          op.operation,
          op.operator,
          path
        );
        if (dependencies.length > 0)
          pipeline.unshift(
            ...flattenDeep(
              dependencies.map((dep) =>
                this.buildPipeline(dep.operation, `aux.${dep.path}`, choiceMaps)
              )
            )
          );
        pipeline.push(step as PipelineStage.AddFields);
        break;
      }
      case 'today': {
        const { step, dependencies } = this.resolveTodayOperator(
          op.operator,
          path
        );
        if (dependencies.length > 0)
          pipeline.unshift(
            ...flattenDeep(
              dependencies.map((dep) =>
                this.buildPipeline(dep.operation, `aux.${dep.path}`, choiceMaps)
              )
            )
          );
        pipeline.push(step as PipelineStage.AddFields);
        break;
      }
    }

    return pipeline;
  }
}
