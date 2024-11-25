import { Form, Record } from '@models';
import * as Survey from 'survey-knockout';

/**
 * Force the evaluation of record expressions
 *
 * @param form Current form
 * @param record edited record
 * @returns Updated record data
 */
export const checkRecordExpressions = (form: Form, record: Record): Record => {
  console.log(record.data);
  // Instantiate survey from form
  const survey = new Survey.Model(form.structure);

  // Setting this variable forces the expressions to evaluate. It has not other purpose.
  survey.setVariable('__forcingExpressionsEvaluation', 1);

  // Fill the survey data with current record data to allow expressions to fetch values of other questions.
  survey.data = { ...survey.data, ...record.data };

  record.data = survey.data;
  return record;
};

export default checkRecordExpressions;
