import { Resource } from '@models';
import {
  Translator,
  UniquenessCheckResult,
  UniquenessContext,
  UniquenessRule,
  UniquenessViolation,
  getConditionMongoFilter,
  getRange,
  getViolationMessage,
  isEmptyValue,
  matchesCondition,
  normalizeValue,
  rangesOverlap,
} from './validateUniqueness';

/**
 * Records the given rule as a violation on a row's result.
 *
 * @param result the row's result to update, in place
 * @param rule the violated rule
 * @param t optional translator used to localize default violation messages
 * @param locale optional locale of the user, used to pick the translation of custom violation messages
 */
const pushViolation = (
  result: UniquenessCheckResult,
  rule: UniquenessRule,
  t?: Translator,
  locale?: string
) => {
  const message = getViolationMessage(rule, t, locale);
  const violation: UniquenessViolation = {
    question: rule.name || rule.fields.join(' + '),
    errors: [message],
    severity: rule.severity === 'warning' ? 'warning' : 'error',
  };
  result[rule.severity === 'warning' ? 'warnings' : 'errors'].push(violation);
};

/**
 * Groups row indices by the value of a rule's scope fields, only including
 * rows that match the rule's condition and have every scope field set.
 *
 * @param rows row data to group
 * @param rule the rule whose fields define the grouping
 * @param conditionFilter Mongo filter of the rule, restricting the rows it applies to
 * @returns a map from composite key to the indices of matching rows
 */
const groupByScope = (
  rows: any[],
  rule: UniquenessRule,
  conditionFilter: Record<string, any> | null
): Map<string, number[]> => {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    if (!matchesCondition(row, conditionFilter)) return;
    if (rule.fields.some((field) => isEmptyValue(row[field]))) return;
    const key = JSON.stringify(
      rule.fields.map((field) => normalizeValue(row[field]))
    );
    const group = groups.get(key);
    if (group) {
      group.push(index);
    } else {
      groups.set(key, [index]);
    }
  });
  return groups;
};

/**
 * Checks the uniqueness rules configured on a resource against a batch of
 * not-yet-saved rows (e.g. parsed from a bulk import file), reporting
 * duplicates found within the batch itself. This is independent of, and
 * complementary to, {@link validateUniqueness} which only compares a row
 * against already-persisted records.
 *
 * For a plain rule, every row sharing the same scope field values as an
 * earlier row in the batch is flagged. For a date-intersection rule, rows
 * sharing the same scope field values are flagged if their date range
 * overlaps an earlier row's range. Values are compared the same way as in
 * {@link validateUniqueness}.
 *
 * @param rows row data of the batch being imported
 * @param resource the resource the rows belong to, or null if none
 * @param t optional translator used to localize default violation messages
 * @param context optional request context: its locale is used to pick the translation of custom violation messages, and its user to resolve the filters depending on them
 * @returns one result per row, in the same order as `rows`
 */
export const validateBatchUniqueness = (
  rows: any[],
  resource: Resource | null,
  t?: Translator,
  context?: UniquenessContext
): UniquenessCheckResult[] => {
  const results: UniquenessCheckResult[] = rows.map(() => ({
    errors: [],
    warnings: [],
  }));
  const rules: UniquenessRule[] = resource?.uniquenessRules || [];
  if (!rules.length) {
    return results;
  }

  for (const rule of rules) {
    if (rule.active === false) continue;
    if (!rule.fields?.length) continue;
    const conditionFilter = getConditionMongoFilter(rule, resource, context);

    if (rule.dateIntersection?.startField && rule.dateIntersection?.endField) {
      const { startField, endField, allowAdjacent } = rule.dateIntersection;
      const ranges = rows.map((row) => getRange(row, startField, endField));
      const groups = groupByScope(
        rows.map((row, index) => (ranges[index] ? row : {})),
        rule,
        conditionFilter
      );
      for (const indices of groups.values()) {
        for (let i = 1; i < indices.length; i++) {
          const current = indices[i];
          const overlapsEarlier = indices
            .slice(0, i)
            .some((earlier) =>
              rangesOverlap(
                ...ranges[current],
                ...ranges[earlier],
                allowAdjacent
              )
            );
          if (overlapsEarlier) {
            pushViolation(results[current], rule, t, context?.locale);
          }
        }
      }
    } else {
      const groups = groupByScope(rows, rule, conditionFilter);
      for (const indices of groups.values()) {
        for (let i = 1; i < indices.length; i++) {
          const current = indices[i];
          pushViolation(results[current], rule, t, context?.locale);
        }
      }
    }
  }

  return results;
};
