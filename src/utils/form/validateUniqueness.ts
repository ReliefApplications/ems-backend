import { Record as RecordModel, Resource } from '@models';
import { Types } from 'mongoose';
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
  value === undefined || value === null || value === '';

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
    return t
      ? t('mutations.record.uniqueness.wholeResource')
      : 'this resource';
  }
  return scopeFields.map((field) => `${field}: ${data[field]}`).join(', ');
};

/**
 * Replaces the `{fields}`, `{scope}` and `{matchCount}` tokens in a
 * custom, admin-authored violation message.
 *
 * @param template the message template
 * @param tokens the token values
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
 * scope fields (or, for a date-intersection rule, its start/end fields) is
 * missing from the data, as uniqueness cannot be meaningfully evaluated on
 * incomplete values.
 *
 * @param data full record data (existing data merged with the proposed update)
 * @param resource the resource the record belongs to, or null if none
 * @param currentRecordId id of the record being edited, excluded from the duplicate search
 * @param t optional translator used to localize default violation messages
 * @param ability optional requesting user's ability, used to filter which matching records ('showMatches') can be shown to them
 * @returns errors (blocking) and warnings (non-blocking) violations found
 */
export const validateUniqueness = async (
  data: any,
  resource: Resource | null,
  currentRecordId?: string | Types.ObjectId,
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
      ...conditionToMongoFilter(rule.condition),
    };
    if (currentRecordId) {
      query._id = { $ne: currentRecordId };
    }
    for (const field of rule.fields) {
      query[`data.${field}`] = data[field];
    }

    let matchCount = 0;
    let matches: UniquenessMatch[] | undefined;
    let hiddenMatchCount: number | undefined;

    if (rule.dateIntersection?.startField && rule.dateIntersection?.endField) {
      const { startField, endField, allowAdjacent } = rule.dateIntersection;
      const start = toTime(data[startField]);
      const end = toTime(data[endField]);
      if (start === null || end === null) continue;
      // The exact-match filter above only scopes candidates by `fields`;
      // the range comparison itself has to happen in JS.
      const candidates = await RecordModel.find(query);
      const overlapping = candidates.filter((candidate) => {
        const candidateStart = toTime(candidate.data?.[startField]);
        const candidateEnd = toTime(candidate.data?.[endField]);
        if (candidateStart === null || candidateEnd === null) return false;
        return rangesOverlap(
          start,
          end,
          candidateStart,
          candidateEnd,
          allowAdjacent
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
