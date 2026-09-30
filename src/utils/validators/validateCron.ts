import { isValidCron } from 'cron-validator';

/**
 * Validate a cron expression, accepting day/month aliases (e.g. MON, JAN) so the
 * backend agrees with the frontend cron validator and the cron executor.
 *
 * @param cron cron expression to validate
 * @returns whether the expression is a valid cron
 */
export const isValidCronExpression = (cron: string): boolean =>
  isValidCron(cron, { alias: true });
