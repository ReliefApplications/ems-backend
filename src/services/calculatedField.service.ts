import { flattenDeep, isNil } from 'lodash';
import { PipelineStage } from 'mongoose';
import {
  DateOperationTypes,
  DoubleOperatorOperationsTypes,
  MultipleOperatorsOperationsTypes,
  Operation,
  Operator,
  RelatedOperation,
  SingleOperatorOperationsTypes,
} from '@const/calculatedFields';
import { referenceDataType } from '@const/enumTypes';
import {
  getExpressionFromString,
  OperationTypeMap,
} from '@utils/aggregation/expressionFromString';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import { getFullChoices } from '@utils/form/getDisplayText';
import { ApiConfiguration, ReferenceData, Resource } from '@models';
import { CustomAPI } from '@server/apollo/dataSources';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';
import { getDraftRecordFilter } from '@utils/filter';

/**
 * Minimal resource shape the service needs — just the field list, plus an
 * optional name for error messages and an optional _id (required to resolve
 * `calc.related*(...)` reverse links). Accepts a full Resource document too.
 */
type ResourceLike = { fields: any[]; name?: string; _id?: any } | null;

type UserAttributes = Record<string, unknown>;

type Dependency = {
  operation: Operation;
  path: string;
};

/** Pre-fetched mapping of stored value → display label for a field */
type ChoiceMap = { value: any; text: any }[];

/** Pre-fetched resolution of a link used by a `calc.related*` operation */
type RelatedContext = {
  /** _id of the resource whose records are aggregated */
  childResourceId: any;
  /**
   * Reverse link: name of the child field storing the current record's id.
   * Unset for forward links.
   */
  childFieldName?: string;
  /**
   * Forward link: name of the field on the current resource storing the
   * linked record id(s). Unset for reverse links.
   */
  parentFieldName?: string;
  /** Child resource fields, used to compile the optional filter argument */
  childFields: any[];
};

/** Record-level (non-data) fields accepted as value/sort fields of `calc.related*` */
const RELATED_INFO_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  modifiedAt: 'modifiedAt',
  updatedAt: 'modifiedAt',
  incrementalId: 'incrementalId',
};

/** Maps resource field types to calculated field types, for `relatedValue`/`relatedMin`/`relatedMax` */
const FIELD_TYPE_TO_CALC_TYPE: Record<string, string> = {
  date: 'date',
  datetime: 'date',
  'datetime-local': 'date',
  time: 'date',
  numeric: 'numeric',
  decimal: 'numeric',
  int: 'numeric',
  integer: 'numeric',
  number: 'numeric',
  boolean: 'boolean',
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
  join: '$reduce',
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
    const relatedNames = new Set<string>();
    this.collectRelatedNames(parsed, relatedNames);
    const relatedContexts = await this.prefetchRelatedContexts(relatedNames);

    if (parsed.type === 'expression') {
      return this.buildPipeline(
        parsed.value,
        name,
        choiceMaps,
        relatedContexts
      );
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
   * Checks whether an expression contains a `calc.related*(...)` operation,
   * i.e. whether compiling it produces $lookup stages over related records.
   *
   * @param expression Calculated-field expression in string form
   * @returns true when the expression aggregates over a related resource
   */
  static hasRelatedOperation(expression: string): boolean {
    return /calc\.related(Value|Count|Exists|Sum|Min|Max|Avg)\s*\(/.test(
      expression
    );
  }

  /**
   * Resolves the calculated-field type of an expression. Same as the static
   * `OperationTypeMap`, except that `relatedValue` / `relatedMin` /
   * `relatedMax` derive their type from the related resource's value field
   * (e.g. the latest value of a date field is a date), so the grid offers the
   * right sort/filter operators.
   *
   * @param expression Calculated-field expression in string form
   * @returns The calculated field type ('text' | 'numeric' | 'boolean' | 'date')
   */
  async getExpressionType(expression: string): Promise<string> {
    const parsed = getExpressionFromString(expression);
    if (parsed.type !== 'expression') return 'text';
    const operation = parsed.value;
    if (
      'relatedName' in operation &&
      ['relatedValue', 'relatedMin', 'relatedMax'].includes(
        operation.operation
      ) &&
      operation.valueField
    ) {
      if (RELATED_INFO_FIELDS[operation.valueField])
        return operation.valueField === 'incrementalId' ? 'text' : 'date';
      const relatedContexts = await this.prefetchRelatedContexts(
        new Set([operation.relatedName])
      );
      const childField = relatedContexts[
        operation.relatedName
      ].childFields.find((f: any) => f.name === operation.valueField);
      if (childField?.type && FIELD_TYPE_TO_CALC_TYPE[childField.type])
        return FIELD_TYPE_TO_CALC_TYPE[childField.type];
    }
    return OperationTypeMap[operation.operation] ?? 'text';
  }

  /**
   * Recursively collect every related name referenced by a `calc.related*(...)`
   * inside the expression so the reverse links can be resolved upfront.
   *
   * @param op Operator subtree to walk
   * @param acc Accumulator set, mutated in place with the related names found
   */
  private collectRelatedNames(op: Operator, acc: Set<string>) {
    if (op.type !== 'expression') return;
    const operation = op.value;
    if ('relatedName' in operation) {
      acc.add(operation.relatedName);
      return;
    }
    if ('operator' in operation && operation.operator)
      this.collectRelatedNames(operation.operator, acc);
    if ('operator1' in operation)
      this.collectRelatedNames(operation.operator1, acc);
    if ('operator2' in operation)
      this.collectRelatedNames(operation.operator2, acc);
    if ('operators' in operation)
      operation.operators.forEach((sub) => this.collectRelatedNames(sub, acc));
  }

  /**
   * Resolve each referenced related name to the resource and field carrying
   * the link. A related name is either the name of a `resource`/`resources`
   * field of the current resource (forward link — the current record stores
   * the linked record ids), or the `relatedName` of a field of another
   * resource pointing at the current one (reverse link — the linked records
   * store the current record's id).
   *
   * @param relatedNames Related names referenced by `calc.related*(...)`
   * @returns Map of related name → resolved related context
   */
  private async prefetchRelatedContexts(
    relatedNames: Set<string>
  ): Promise<Record<string, RelatedContext>> {
    if (relatedNames.size === 0) return {};
    const resource = this.resource;
    if (!resource || !resource._id)
      throw new Error(
        'CalculatedFieldService: a Resource with an _id is required to resolve calc.related*(...)'
      );
    const resourceId = String(resource._id);

    const entries = await Promise.all(
      Array.from(relatedNames).map(
        async (relatedName) =>
          [
            relatedName,
            await this.resolveRelatedContext(resourceId, relatedName),
          ] as const
      )
    );
    return Object.fromEntries(entries);
  }

  /**
   * Resolves a single related name to the resource and field carrying the
   * link (see {@link prefetchRelatedContexts}).
   *
   * @param resourceId Id of the current resource, as a string
   * @param relatedName Related name to resolve
   * @returns The resolved related context
   */
  private async resolveRelatedContext(
    resourceId: string,
    relatedName: string
  ): Promise<RelatedContext> {
    const resource = this.resource;
    // Forward link: a resource(s) field of the current resource
    const ownField = resource.fields.find(
      (f: any) =>
        f.name === relatedName &&
        ['resource', 'resources'].includes(f.type) &&
        f.resource
    );
    if (ownField) {
      const child = await Resource.findById(ownField.resource, {
        name: 1,
        fields: 1,
      });
      if (!child)
        throw new Error(
          `calc.related*: the resource targeted by field "${relatedName}" does not exist`
        );
      return {
        childResourceId: child._id,
        parentFieldName: ownField.name,
        childFields: child.fields,
      };
    }

    // Reverse link: a field of another resource pointing at this one
    const childResources = await Resource.find(
      {
        fields: { $elemMatch: { resource: resourceId, relatedName } },
      },
      { name: 1, fields: 1 }
    );
    const matches = childResources.flatMap((child: any) =>
      child.fields
        .filter(
          (f: any) => f.resource === resourceId && f.relatedName === relatedName
        )
        .map((f: any) => ({ child, field: f }))
    );
    if (matches.length === 0)
      throw new Error(
        `calc.related*: unknown related name "${relatedName}" — no resource field of ${
          resource.name ?? resourceId
        } or of another resource pointing at it matches this name`
      );
    if (matches.length > 1)
      throw new Error(
        `calc.related*: ambiguous related name "${relatedName}", defined by several fields (on ${matches
          .map((m) => m.child.name)
          .join(', ')})`
      );
    return {
      childResourceId: matches[0].child._id,
      childFieldName: matches[0].field.name,
      childFields: matches[0].child.fields,
    };
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
            : {
                value: c.value,
                // Resolve the (possibly localized) text to the active locale,
                // falling back to the raw value when no translation is available.
                text:
                  resolveLocalizedString(c.text, this.context?.locale) ||
                  c.value,
              }
        );
      }
      return [];
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
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
   * Build the stages for a `related*` operation: a `$lookup` joining the
   * records of the related resource that link back to the current record
   * (child stores the parent id in `data.<childFieldName>`), whose
   * sub-pipeline filters/sorts/aggregates on the child side so only the
   * needed value is pulled, then an `$addFields` extracting it.
   *
   * @param op The related operation to compile
   * @param path Target path (`data.<x>` or `aux.<x>`)
   * @param relatedContexts Pre-fetched reverse-link resolutions by related name
   * @returns Ordered pipeline stages producing the aggregated value
   */
  private buildRelatedStages(
    op: RelatedOperation,
    path: string,
    relatedContexts: Record<string, RelatedContext>
  ): PipelineStage[] {
    const ctx = relatedContexts[op.relatedName];
    const target = path.startsWith('aux.') ? path : `data.${path}`;
    const joined = `aux.${path.replace(/[^a-zA-Z0-9_]/g, '_')}_related`;
    // Value/sort fields address child data, except record-level info fields
    const childPath = (field: string) =>
      RELATED_INFO_FIELDS[field] ?? `data.${field}`;
    for (const field of [op.valueField, op.sortField]) {
      if (
        field &&
        !RELATED_INFO_FIELDS[field] &&
        !ctx.childFields.some((f: any) => f.name === field)
      )
        throw new Error(
          `calc.${op.operation}: unknown field "${field}" on the related resource of "${op.relatedName}"`
        );
    }

    const baseMatch: any = {
      resource: ctx.childResourceId,
      archived: { $ne: true },
      ...getDraftRecordFilter(),
    };
    const filterMatch = op.filter
      ? getFilter(op.filter, ctx.childFields, this.context)
      : {};
    const subPipeline: any[] = [
      {
        $match:
          Object.keys(filterMatch).length > 0
            ? { $and: [baseMatch, filterMatch] }
            : baseMatch,
      },
    ];

    let extract: any;
    switch (op.operation) {
      case 'relatedValue':
        subPipeline.push(
          {
            $sort: {
              [childPath(op.sortField)]: op.sortOrder === 'desc' ? -1 : 1,
              // Tiebreaker keeps the picked record stable across queries
              _id: op.sortOrder === 'desc' ? -1 : 1,
            },
          },
          { $limit: 1 },
          { $project: { _id: 0, v: `$${childPath(op.valueField)}` } }
        );
        extract = {
          $ifNull: [{ $arrayElemAt: [`$${joined}.v`, 0] }, null],
        };
        break;
      case 'relatedCount':
        subPipeline.push({ $count: 'v' });
        extract = {
          $ifNull: [{ $arrayElemAt: [`$${joined}.v`, 0] }, 0],
        };
        break;
      case 'relatedExists':
        subPipeline.push({ $limit: 1 }, { $project: { _id: 1 } });
        extract = { $gt: [{ $size: `$${joined}` }, 0] };
        break;
      default: {
        // relatedSum / relatedMin / relatedMax / relatedAvg
        const groupOperator = `$${op.operation
          .replace('related', '')
          .toLowerCase()}`;
        subPipeline.push({
          $group: {
            _id: null,
            v: { [groupOperator]: `$${childPath(op.valueField)}` },
          },
        });
        extract = {
          $ifNull: [
            { $arrayElemAt: [`$${joined}.v`, 0] },
            op.operation === 'relatedSum' ? 0 : null,
          ],
        };
      }
    }

    if (ctx.parentFieldName) {
      // Forward link: the current record stores the linked record id(s)
      const stored = `$data.${ctx.parentFieldName}`;
      const idsPath = `${joined}_ids`;
      return [
        {
          $addFields: {
            [idsPath]: {
              $map: {
                input: {
                  $cond: {
                    if: { $isArray: stored },
                    then: stored,
                    else: {
                      $cond: {
                        if: { $eq: [stored, null] },
                        then: [],
                        else: [stored],
                      },
                    },
                  },
                },
                as: 'relId',
                in: {
                  $convert: { input: '$$relId', to: 'objectId', onError: null },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'records',
            localField: idsPath,
            foreignField: '_id',
            as: joined,
            pipeline: subPipeline,
          },
        },
        { $addFields: { [target]: extract } },
      ] as PipelineStage[];
    }
    return [
      // Reverse link: child records store the parent id as a string
      { $addFields: { __recordId: { $toString: '$_id' } } },
      {
        $lookup: {
          from: 'records',
          localField: '__recordId',
          foreignField: `data.${ctx.childFieldName}`,
          as: joined,
          pipeline: subPipeline,
        },
      },
      { $addFields: { [target]: extract } },
    ] as PipelineStage[];
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
   * operands (`sub`, `div`, comparisons, `datediff`, `includes`, `join`). Order
   * matters — operator1 is the left-hand side. Nested expressions are queued
   * as dependencies and referenced through aux paths.
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
      case 'join':
        step = {
          $addFields: {
            [path.startsWith('aux.') ? path : `data.${path}`]: {
              $let: {
                vars: {
                  joinReduced: {
                    $reduce: {
                      input: {
                        $cond: {
                          if: { $isArray: getValueString(1) },
                          then: getValueString(1),
                          else: [],
                        },
                      },
                      initialValue: { i: 0, s: '' },
                      in: {
                        i: { $add: ['$$value.i', 1] },
                        s: {
                          $concat: [
                            '$$value.s',
                            {
                              $cond: {
                                if: { $eq: ['$$value.i', 0] },
                                then: '',
                                else: {
                                  $convert: {
                                    input: getValueString(2),
                                    to: 'string',
                                    onError: '',
                                    onNull: '',
                                  },
                                },
                              },
                            },
                            {
                              $convert: {
                                input: '$$this',
                                to: 'string',
                                onError: '',
                                onNull: '',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
                in: '$$joinReduced.s',
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
   * @param relatedContexts Pre-fetched reverse-link resolutions consumed by `related*`
   * @returns Ordered list of pipeline stages
   */
  private buildPipeline(
    op: Operation,
    path: string,
    choiceMaps: Record<string, ChoiceMap>,
    relatedContexts: Record<string, RelatedContext> = {}
  ): PipelineStage[] {
    const pipeline: PipelineStage[] = [];

    switch (op.operation) {
      case 'displayValue': {
        pipeline.push(
          this.buildDisplayValueStage(op.fieldName, path, choiceMaps)
        );
        break;
      }
      case 'relatedValue':
      case 'relatedCount':
      case 'relatedExists':
      case 'relatedSum':
      case 'relatedMin':
      case 'relatedMax':
      case 'relatedAvg': {
        pipeline.push(...this.buildRelatedStages(op, path, relatedContexts));
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
                this.buildPipeline(
                  dep.operation,
                  `aux.${dep.path}`,
                  choiceMaps,
                  relatedContexts
                )
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
      case 'includes':
      case 'join': {
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
                this.buildPipeline(
                  dep.operation,
                  `aux.${dep.path}`,
                  choiceMaps,
                  relatedContexts
                )
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
                this.buildPipeline(
                  dep.operation,
                  `aux.${dep.path}`,
                  choiceMaps,
                  relatedContexts
                )
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
                this.buildPipeline(
                  dep.operation,
                  `aux.${dep.path}`,
                  choiceMaps,
                  relatedContexts
                )
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
