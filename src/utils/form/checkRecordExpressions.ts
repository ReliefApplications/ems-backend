import { Record } from '@models';
import * as Survey from 'survey-knockout';

/**
 * Force the evaluation of record expressions
 *
 * @param record edited record
 * @param survey survey instance from record's form
 * @returns Updated record data
 */
export const checkRecordExpressions = (
  record: Record,
  survey: Survey.Survey
): Record => {
  // Fill the survey data with current record data to allow expressions to fetch values of other questions.
  survey.data = { ...survey.data, ...record.data };

  // Setting this variable forces the expressions to evaluate. It has not other purpose.
  survey.setVariable('__forcingExpressionsEvaluation', 1);

  record.data = survey.data;
  return record;
};

export default checkRecordExpressions;
