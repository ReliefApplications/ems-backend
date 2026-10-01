import { Record as RecordModel, Resource } from '@models';
import { Types } from 'mongoose';
import { castArray, escapeRegExp } from 'lodash';
import { GraphQLError } from 'graphql';
import { logger } from '@services/logger.service';
import { AppAbility } from '@security/defineUserAbility';

/** Translator function, as exposed by i18next (context.i18next.t / req.t) */
export type Translator = (key: string, options?: Record<string, any>) => string;

/** A matching record surfaced to the user for a violated rule */
export interface UniquenessMatch {
  id: string;
  incrementalId?: string;
}

/** A single uniqueness violation, in the same shape as survey validation errors */
export type UniquenessViolation = {
  question: string;
  errors: string[];
  /** Severity of the violated rule: warnings can be bypassed by the user, errors cannot */
  severity?: 'error' | 'warning';
  /** Matching records the requesting user is allowed to read, if `rule.showMatches` is set */
  matches?: UniquenessMatch[];
  /** Number of additional matching records the requesting user cannot read */
  hiddenMatchCount?: number;
};

/** Result of a uniqueness check, split by severity */
export interface UniquenessCheckResult {
  errors: UniquenessViolation[];
  warnings: UniquenessViolation[];
}

/** A single 'only apply when' condition of a uniqueness rule */
export interface UniquenessCondition {
  field: string;
  operator: 'eq' | 'ne';
  value: any;
}

/** A uniqueness rule, as stored on a resource */
export interface UniquenessRule {
  name?: string;
  fields: string[];
  severity: 'error' | 'warning';
  message?: string;
  /** Whether the rule is enforced. Defaults to true; set to false to keep a rule without deleting it. */
  active?: boolean;
  /** Whether to surface the actual matching records to the user (subject to their read permissions) */
  showMatches?: boolean;
  condition?: UniquenessCondition[];
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

/** Max number of matching record documents fetched when `showMatches` is set */
const MATCH_FETCH_LIMIT = 20;
/** Max number of matching records actually surfaced in a violation */
const MATCH_DISPLAY_LIMIT = 5;

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
 * Whether the given data satisfies a rule's 'only apply when' conditions.
 *
 * @param data record data to check
 * @param condition list of conditions, ANDed together
 * @returns true if there is no condition, or all of them are satisfied
 */
export const matchesCondition = (
  data: any,
  condition?: UniquenessCondition[]
): boolean =>
  (condition || []).every((c) =>
    c.operator === 'ne' ? data[c.field] !== c.value : data[c.field] === c.value
  );

/**
 * Translates a rule's conditions into a Mongo filter on `data.<field>`, so
 * that only records also matching the condition are considered.
 *
 * @param condition list of conditions, ANDed together
 * @returns a Mongo filter object
 */
const conditionToMongoFilter = (
  condition?: UniquenessCondition[]
): Record<string, any> => {
  const filter: Record<string, any> = {};
  for (const c of condition || []) {
    filter[`data.${c.field}`] =
      c.operator === 'ne' ? { $ne: c.value } : c.value;
  }
  return filter;
};

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
  const isDateIntersection = !!(
    rule.dateIntersection?.startField && rule.dateIntersection?.endField
  );
  if (t) {
    return isDateIntersection
      ? t('mutations.record.uniqueness.errors.dateIntersection', { fields })
      : t('mutations.record.uniqueness.errors.duplicate', { fields });
  }
  return isDateIntersection
    ? `This would overlap with another record on the same ${fields}.`
    : `A record with the same ${fields} already exists.`;
};

/**
 * Renders a rule's scope for the `{scope}` message token. By convention the
 * first field of a rule is the value being checked for uniqueness, and any
 * remaining fields form the scope it is grouped by (e.g. for
 * `fields: ['nationalId', 'country']`, a duplicate nationalId is only a
 * violation within the same country, so the scope is that country).
 *
 * @param rule the violated rule
 * @param data the record data, used to read the actual scope values
 * @param t optional translator, used for the 'whole resource' fallback
 * @returns a human readable description of the scope
 */
export const renderScope = (
  rule: UniquenessRule,
  data: any,
  t?: Translator
): string => {
  const scopeFields = rule.fields.slice(1);
  if (!scopeFields.length) {
    return t ? t('mutations.record.uniqueness.wholeResource') : 'this resource';
  }
  return scopeFields.map((field) => `${field}: ${data[field]}`).join(', ');
};

/**
 * Replaces the `{fields}`, `{scope}` and `{matchCount}` tokens in a
 * custom, admin-authored violation message.
 *
 * @param template the message template
 * @param tokens the token values
 * @param tokens.fields the rule's fields, joined
 * @param tokens.scope the rule's scope, rendered as text
 * @param tokens.matchCount the number of matching records found
 * @returns the interpolated message
 */
export const interpolateMessage = (
  template: string,
  tokens: { fields: string; scope: string; matchCount: number }
): string =>
  template
    .replace(/{fields}/g, tokens.fields)
    .replace(/{scope}/g, tokens.scope)
    .replace(/{matchCount}/g, String(tokens.matchCount));

/**
 * Splits matching record documents into the ones the given ability can
 * read (capped, for display) and a count of the ones it cannot (only ever
 * reported as a number, never their content).
 *
 * @param candidates matching record documents
 * @param ability the requesting user's ability, if known; when absent, every candidate is treated as readable
 * @returns readable matches (capped to MATCH_DISPLAY_LIMIT) and the number of hidden ones
 */
const buildMatches = (
  candidates: any[],
  ability?: AppAbility
): { matches: UniquenessMatch[]; hiddenMatchCount: number } => {
  // Fail closed: without a known ability (e.g. an unauthenticated public
  // form submission), no match is considered readable.
  const readable = ability
    ? candidates.filter((record) => ability.can('read', record))
    : [];
  return {
    matches: readable.slice(0, MATCH_DISPLAY_LIMIT).map((record) => ({
      id: String(record._id),
      incrementalId: record.incrementalId,
    })),
    hiddenMatchCount: candidates.length - readable.length,
  };
};

/**
 * Checks the uniqueness rules configured on a resource against the given
 * record data, and reports any duplicate found among existing records of
 * that resource.
 *
 * A rule only applies to records matching its 'only apply when' conditions,
 * if any, and only when it is active. It is skipped entirely if any of its
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
 * @param ability optional requesting user's ability, used to filter which matching records ('showMatches') can be shown to them
 * @returns errors (blocking) and warnings (non-blocking) violations found
 */
export const validateUniqueness = async (
  data: any,
  resource: Resource | null,
  excludedRecordIds?: string | Types.ObjectId | (string | Types.ObjectId)[],
  t?: Translator,
  ability?: AppAbility
): Promise<UniquenessCheckResult> => {
  const result: UniquenessCheckResult = { errors: [], warnings: [] };
  const rules: UniquenessRule[] = resource?.uniquenessRules || [];
  if (!rules.length) {
    return result;
  }

  for (const rule of rules) {
    if (rule.active === false) continue;
    if (!rule.fields?.length) continue;
    if (!matchesCondition(data, rule.condition)) continue;
    if (rule.fields.some((field) => isEmptyValue(data[field]))) continue;

    const query: Record<string, any> = {
      resource: resource._id,
      archived: { $ne: true },
      // Drafts are not submitted yet, so they cannot be duplicates
      draft: { $ne: true },
      ...conditionToMongoFilter(rule.condition),
    };
    if (excludedRecordIds) {
      query._id = { $nin: castArray(excludedRecordIds) };
    }
    for (const field of rule.fields) {
      query[`data.${field}`] = toMatchFilter(data[field]);
    }

    let matchCount = 0;
    let matches: UniquenessMatch[] | undefined;
    let hiddenMatchCount: number | undefined;

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
      matchCount = overlapping.length;
      if (rule.showMatches && matchCount) {
        ({ matches, hiddenMatchCount } = buildMatches(overlapping, ability));
      }
    } else {
      matchCount = await RecordModel.countDocuments(query);
      if (rule.showMatches && matchCount) {
        const candidates = await RecordModel.find(query).limit(
          MATCH_FETCH_LIMIT
        );
        ({ matches, hiddenMatchCount } = buildMatches(candidates, ability));
      }
    }

    if (matchCount > 0) {
      const message = rule.message
        ? interpolateMessage(rule.message, {
            fields: rule.fields.join(', '),
            scope: renderScope(rule, data, t),
            matchCount,
          })
        : defaultMessage(rule, t);
      const violation: UniquenessViolation = {
        question: rule.name || rule.fields.join(' + '),
        errors: [message],
        severity: rule.severity === 'warning' ? 'warning' : 'error',
        ...(matches && { matches }),
        ...(hiddenMatchCount !== undefined && { hiddenMatchCount }),
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
