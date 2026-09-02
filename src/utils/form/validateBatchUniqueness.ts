import { Resource } from '@models';
import {
  Translator,
  UniquenessCheckResult,
  UniquenessRule,
  UniquenessViolation,
  defaultMessage,
  isEmptyValue,
  matchesCondition,
  rangesOverlap,
  toTime,
} from './validateUniqueness';

/**
 * Records the given rule as a violation on a row's result.
 *
 * @param result the row's result to update, in place
 * @param rule the violated rule
 * @param t optional translator used to localize default violation messages
 */
const pushViolation = (
  result: UniquenessCheckResult,
  rule: UniquenessRule,
  t?: Translator
) => {
  const violation: UniquenessViolation = {
    question: rule.name || rule.fields.join(' + '),
    errors: [rule.message || defaultMessage(rule, t)],
  };
  result[rule.severity === 'warning' ? 'warnings' : 'errors'].push(violation);
};

/**
 * Groups row indices by the value of a rule's scope fields, only including
 * rows that match the rule's condition and have every scope field set.
 *
 * @param rows row data to group
 * @param rule the rule whose fields/condition define the grouping
 * @returns a map from composite key to the indices of matching rows
 */
const groupByScope = (
  rows: any[],
  rule: UniquenessRule
): Map<string, number[]> => {
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    if (!matchesCondition(row, rule.condition)) return;
    if (rule.fields.some((field) => isEmptyValue(row[field]))) return;
    const key = JSON.stringify(rule.fields.map((field) => row[field]));
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
 * overlaps an earlier row's range.
 *
 * @param rows row data of the batch being imported
 * @param resource the resource the rows belong to, or null if none
 * @param t optional translator used to localize default violation messages
 * @returns one result per row, in the same order as `rows`
 */
export const validateBatchUniqueness = (
  rows: any[],
  resource: Resource | null,
  t?: Translator
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
    if (!rule.fields?.length) continue;

    if (rule.dateIntersection?.startField && rule.dateIntersection?.endField) {
      const { startField, endField, allowAdjacent } = rule.dateIntersection;
      const groups = groupByScope(
        rows.map((row) =>
          toTime(row[startField]) !== null && toTime(row[endField]) !== null
            ? row
            : {}
        ),
        rule
      );
      for (const indices of groups.values()) {
        for (let i = 1; i < indices.length; i++) {
          const current = indices[i];
          const currentStart = toTime(rows[current][startField]) as number;
          const currentEnd = toTime(rows[current][endField]) as number;
          const overlapsEarlier = indices
            .slice(0, i)
            .some((earlier) =>
              rangesOverlap(
                currentStart,
                currentEnd,
                toTime(rows[earlier][startField]) as number,
                toTime(rows[earlier][endField]) as number,
                allowAdjacent
              )
            );
          if (overlapsEarlier) {
            pushViolation(results[current], rule, t);
          }
        }
      }
    } else {
      const groups = groupByScope(rows, rule);
      for (const indices of groups.values()) {
        for (let i = 1; i < indices.length; i++) {
          pushViolation(results[indices[i]], rule, t);
        }
      }
    }
  }

  return results;
};
