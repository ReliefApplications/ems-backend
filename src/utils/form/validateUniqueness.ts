import { Record as RecordModel, Resource } from '@models';
import { Types } from 'mongoose';
import { castArray, escapeRegExp } from 'lodash';
import { GraphQLError } from 'graphql';
import { logger } from '@services/logger.service';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';
import getFilter, {
  extractFilterFields,
} from '@utils/schema/resolvers/Query/getFilter';
import { conditionsMatcher } from '@security/defineUserAbility';
import { filterOperator } from '../../types';

/** Translator function, as exposed by i18next (context.i18next.t / req.t) */
export type Translator = (key: string, options?: Record<string, any>) => string;

/** A single uniqueness violation, in the same shape as survey validation errors */
export type UniquenessViolation = {
  question: string;
  errors: string[];
  /** Severity of the violated rule: warnings can be bypassed by the user, errors cannot */
  severity?: 'error' | 'warning';
};

/** Part of the request context used when checking uniqueness rules */
export type UniquenessContext = { locale?: string; user?: any };

/** Result of a uniqueness check, split by severity */
export interface UniquenessCheckResult {
  errors: UniquenessViolation[];
  warnings: UniquenessViolation[];
}

/**
 * 'Only apply when' filter of a uniqueness rule, in the same format as the
 * filters of layouts
 */
export interface UniquenessConditionFilter {
  logic: 'and' | 'or';
  filters: any[];
}

/** A uniqueness rule, as stored on a resource */
export interface UniquenessRule {
  name?: string;
  fields: string[];
  severity: 'error' | 'warning';
  message?: string;
  /** Translations of the message, by locale. The message is used when there is none. */
  messageTranslations?: Record<string, string>;
  /** Whether the rule is enforced. Defaults to true; set to false to keep a rule without deleting it. */
  active?: boolean;
  /** Restricts the rule to the records matching this filter. Rules first stored a list of equalities. */
  condition?: UniquenessConditionFilter | any[];
  dateIntersection?: {
    startField: string;
    endField: string;
    allowAdjacent?: boolean;
  };
}

/**
 * Error thrown when a record cannot be saved because of blocking uniqueness
 * rules. This is an expected outcome of the validation, reported to the user,
 * and not a failure of the server: see {@link logUniquenessError}.
 */
export class UniquenessError extends GraphQLError {
  /**
   * Error thrown when a record cannot be saved because of blocking uniqueness
   * rules.
   *
   * @param violations violated rules, or the message to display to the user
   */
  constructor(violations: UniquenessViolation[] | string) {
    super(
      typeof violations === 'string'
        ? violations
        : violations.map((x) => x.errors.join(' ')).join(' ')
    );
  }
}

/**
 * Logs a record rejected because of blocking uniqueness rules. As the request
 * did not fail, this is not logged as an error, and has no stack trace.
 *
 * @param err uniqueness error to log
 */
export const logUniquenessError = (err: UniquenessError): void => {
  logger.warn(`Record not saved, uniqueness rule violated: ${err.message}`);
};

/**
 * Whether a value counts as missing for uniqueness purposes.
 *
 * @param value value to check
 * @returns true if the value should be treated as absent
 */
export const isEmptyValue = (value: any): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

/**
 * Normalizes a value before comparing it to another one: texts are compared
 * regardless of their case and of leading, trailing or repeated whitespaces,
 * so that 'John  Smith ' and 'john smith' are seen as duplicates.
 *
 * @param value value to normalize
 * @returns the normalized value
 */
export const normalizeValue = (value: any): any =>
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : value;

/**
 * Builds the Mongo filter matching the records with the same value, using
 * the same rules as {@link normalizeValue} for texts.
 *
 * @param value value to match
 * @returns a Mongo filter on the value
 */
const toMatchFilter = (value: any): any =>
  typeof value === 'string'
    ? {
        $regex: `^\\s*${value
          .trim()
          .split(/\s+/)
          .map(escapeRegExp)
          .join('\\s+')}\\s*$`,
        $options: 'i',
      }
    : value;

/**
 * Gets the 'only apply when' filter of a rule, in the same format as the
 * filters of layouts ( `{ logic, filters }` ). Conditions were first stored
 * as a list of equalities, all required: they are converted to that format.
 *
 * @param condition condition stored on the rule
 * @returns filter of the rule, or null if it applies to all records
 */
export const getConditionFilter = (
  condition: any
): UniquenessConditionFilter | null => {
  if (Array.isArray(condition)) {
    return condition.length
      ? {
          logic: 'and',
          filters: condition.map((x) => ({
            field: x.field,
            operator:
              x.operator === 'ne'
                ? filterOperator.NOT_EQUAL_TO
                : filterOperator.EQUAL_TO,
            value: x.value,
          })),
        }
      : null;
  }
  return condition?.filters?.length ? condition : null;
};

/**
 * Translates the 'only apply when' filter of a rule into a Mongo filter on
 * the records, the same way the filters of layouts are.
 *
 * @param rule the uniqueness rule
 * @param resource the resource the rule is configured on
 * @param context optional request context, used to resolve the values depending on the user
 * @returns a Mongo filter, or null if the rule applies to all records
 */
export const getConditionMongoFilter = (
  rule: UniquenessRule,
  resource: Resource,
  context?: any
): Record<string, any> | null => {
  const filter = getConditionFilter(rule.condition);
  if (!filter) {
    return null;
  }
  const mongoFilter = getFilter(filter, resource.fields || [], context);
  return Object.keys(mongoFilter).length ? mongoFilter : null;
};

/** Fields referenced by a uniqueness rule */
type UniquenessRuleFields = {
  fields: string[];
  condition?: any;
  dateIntersection?: { startField: string; endField: string };
};

/**
 * Gets the first field referenced by a rule ( unique fields, filter or date
 * range ) which does not exist on the resource, if any.
 *
 * @param rule the uniqueness rule to check
 * @param resource the resource the rule is configured on
 * @returns name of the unknown field, or undefined if all the fields exist
 */
export const getUnknownRuleField = (
  rule: UniquenessRuleFields,
  resource: Resource
): string | undefined => {
  const fieldNames = (resource.fields || []).map((field) => field.name);
  const conditionFilter = getConditionFilter(rule.condition);
  return [
    ...(rule.fields || []),
    // Filters can target a property of a field ( e.g. 'address.city' )
    ...(conditionFilter ? extractFilterFields(conditionFilter) : []).map(
      (field) => field.split('.')[0]
    ),
    ...(rule.dateIntersection
      ? [rule.dateIntersection.startField, rule.dateIntersection.endField]
      : []),
  ].find((field) => !fieldNames.includes(field));
};

/**
 * Whether the given data satisfies the 'only apply when' filter of a rule.
 * The Mongo filter is evaluated in memory, as the data is not saved yet.
 *
 * @param data record data to check
 * @param conditionFilter Mongo filter of the rule, from {@link getConditionMongoFilter}
 * @returns true if there is no filter, or the data satisfies it
 */
export const matchesCondition = (
  data: any,
  conditionFilter: Record<string, any> | null
): boolean => !conditionFilter || conditionsMatcher(conditionFilter)({ data });

/**
 * Parses a value into a timestamp usable for range comparison.
 *
 * @param value the value to parse (expected to be a date or date string)
 * @returns the timestamp, or null if the value is missing or not a valid date
 */
export const toTime = (value: any): number | null => {
  if (isEmptyValue(value)) return null;
  const time = new Date(value).getTime();
  return isNaN(time) ? null : time;
};

/**
 * Gets the date range of a record, for a date-intersection rule. A missing
 * start or end date makes the range open-ended on that side ( e.g. an
 * assignment without end date is still ongoing ).
 *
 * @param data record data
 * @param startField name of the field storing the start of the range
 * @param endField name of the field storing the end of the range
 * @returns start and end of the range, or null if it cannot be evaluated ( both dates missing, or an invalid date )
 */
export const getRange = (
  data: any,
  startField: string,
  endField: string
): [number, number] | null => {
  const hasStart = !isEmptyValue(data?.[startField]);
  const hasEnd = !isEmptyValue(data?.[endField]);
  if (!hasStart && !hasEnd) return null;
  const start = hasStart ? toTime(data[startField]) : -Infinity;
  const end = hasEnd ? toTime(data[endField]) : Infinity;
  return start === null || end === null ? null : [start, end];
};

/**
 * Whether two date ranges overlap.
 *
 * @param aStart start of the first range
 * @param aEnd end of the first range
 * @param bStart start of the second range
 * @param bEnd end of the second range
 * @param allowAdjacent when true, ranges that only touch at the boundary are not considered overlapping
 * @returns true if the ranges overlap
 */
export const rangesOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  allowAdjacent?: boolean
): boolean =>
  allowAdjacent
    ? aStart < bEnd && bStart < aEnd
    : aStart <= bEnd && bStart <= aEnd;

/**
 * Default violation message for a rule, used when it has no custom message.
 * It is the same for all rules, including the ones checking date ranges.
 * Localized via `t` when provided (e.g. context.i18next.t / req.t), so the
 * user sees the error in their own language; falls back to English otherwise.
 *
 * @param rule the violated rule
 * @param t optional translator
 * @returns a human readable default message
 */
export const defaultMessage = (
  rule: UniquenessRule,
  t?: Translator
): string => {
  const fields = rule.fields.join(', ');
  return t
    ? t('mutations.record.uniqueness.errors.duplicate', { fields })
    : `A record with the same ${fields} already exists.`;
};

/**
 * Gets the message to display to the user for a violated rule: the custom
 * message of the rule, in the language of the user when it is translated, or
 * the default message when the rule has none.
 *
 * @param rule the violated rule
 * @param t optional translator used to localize default violation messages
 * @param locale optional locale of the user, used to pick the translation of a custom message
 * @returns the message to display
 */
export const getViolationMessage = (
  rule: UniquenessRule,
  t?: Translator,
  locale?: string
): string =>
  resolveLocalizedString(rule.messageTranslations, locale) ||
  rule.message ||
  defaultMessage(rule, t);

/**
 * Checks the uniqueness rules configured on a resource against the given
 * record data, and reports any duplicate found among existing records of
 * that resource.
 *
 * A rule only applies to records matching its 'only apply when' filter, if
 * any, and only when it is active. It is skipped entirely if any of its
 * scope fields (or, for a date-intersection rule, both its start and end
 * fields) is missing from the data, as uniqueness cannot be meaningfully
 * evaluated on incomplete values.
 *
 * Text values are compared regardless of their case and of extra
 * whitespaces. Draft records are ignored.
 *
 * @param data full record data (existing data merged with the proposed update)
 * @param resource the resource the record belongs to, or null if none
 * @param excludedRecordIds id(s) of the record(s) being edited, excluded from the duplicate search
 * @param t optional translator used to localize default violation messages
 * @param context optional request context: its locale is used to pick the translation of custom violation messages, and its user to resolve the filters depending on them
 * @returns errors (blocking) and warnings (non-blocking) violations found
 */
export const validateUniqueness = async (
  data: any,
  resource: Resource | null,
  excludedRecordIds?: string | Types.ObjectId | (string | Types.ObjectId)[],
  t?: Translator,
  context?: UniquenessContext
): Promise<UniquenessCheckResult> => {
  const result: UniquenessCheckResult = { errors: [], warnings: [] };
  const rules: UniquenessRule[] = resource?.uniquenessRules || [];
  if (!rules.length) {
    return result;
  }

  for (const rule of rules) {
    if (rule.active === false) continue;
    if (!rule.fields?.length) continue;
    const conditionFilter = getConditionMongoFilter(rule, resource, context);
    if (!matchesCondition(data, conditionFilter)) continue;
    if (rule.fields.some((field) => isEmptyValue(data[field]))) continue;

    const query: Record<string, any> = {
      resource: resource._id,
      archived: { $ne: true },
      // Drafts are not submitted yet, so they cannot be duplicates
      draft: { $ne: true },
      // Only the records the rule applies to can be duplicates
      ...(conditionFilter && { $and: [conditionFilter] }),
    };
    if (excludedRecordIds) {
      query._id = { $nin: castArray(excludedRecordIds) };
    }
    for (const field of rule.fields) {
      query[`data.${field}`] = toMatchFilter(data[field]);
    }

    let isViolated = false;

    if (rule.dateIntersection?.startField && rule.dateIntersection?.endField) {
      const { startField, endField, allowAdjacent } = rule.dateIntersection;
      const range = getRange(data, startField, endField);
      if (!range) continue;
      // The exact-match filter above only scopes candidates by `fields`;
      // the range comparison itself has to happen in JS.
      const candidates = await RecordModel.find(query);
      const overlapping = candidates.filter((candidate) => {
        const candidateRange = getRange(candidate.data, startField, endField);
        return (
          !!candidateRange &&
          rangesOverlap(...range, ...candidateRange, allowAdjacent)
        );
      });
      isViolated = overlapping.length > 0;
    } else {
      isViolated = !!(await RecordModel.exists(query));
    }

    if (isViolated) {
      const message = getViolationMessage(rule, t, context?.locale);
      const violation: UniquenessViolation = {
        question: rule.name || rule.fields.join(' + '),
        errors: [message],
        severity: rule.severity === 'warning' ? 'warning' : 'error',
      };
      if (rule.severity === 'warning') {
        result.warnings.push(violation);
      } else {
        result.errors.push(violation);
      }
    }
  }

  return result;
};
