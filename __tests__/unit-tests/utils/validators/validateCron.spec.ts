import { isValidCronExpression } from '@utils/validators';

describe('isValidCronExpression', () => {
  it('should accept standard five-field cron expressions', () => {
    const validExpressions = [
      '* * * * *',
      '0 5 * * 1',
      '*/15 * * * *',
      '30 8 * * 1-5',
      '0 12 1,15 * *',
      '0 0 1 1 *',
    ];

    validExpressions.forEach((cron) => {
      expect(isValidCronExpression(cron)).toBe(true);
    });
  });

  it('should accept month and weekday aliases, matching the frontend validator', () => {
    const validExpressions = [
      '0 9 * * MON',
      '0 12 * * MON-FRI',
      '0 0 1 JAN *',
      '0 0 1 JAN,JUL *',
    ];

    validExpressions.forEach((cron) => {
      expect(isValidCronExpression(cron)).toBe(true);
    });
  });

  it('should reject malformed expressions', () => {
    const invalidExpressions = [
      '',
      'not a cron',
      '* * * *', // too few fields
      '* * * * * *', // seconds are not supported
      '60 * * * *', // minute out of range
      '* 24 * * *', // hour out of range
      '0 0 32 * *', // day of month out of range
      '0 0 * 13 *', // month out of range
    ];

    invalidExpressions.forEach((cron) => {
      expect(isValidCronExpression(cron)).toBe(false);
    });
  });
});
