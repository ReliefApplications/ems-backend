import { Form, Record } from 'models';
import * as Survey from 'survey-knockout';

/**
 * Check if the record is correct according to the defined surveyjs validators
 *
 * @param record The record to check
 * @param newData The proposed update
 * @param form The formulaire object linked to the record
 * @param lang The current language of the form
 * @returns The list of errors (empty if no errors)
 */
export const checkRecordValidation = (
  record: Record,
  newData: any,
  form: Form,
  lang = 'en'
): { question: string; errors: string[] }[] => {
  // create the form
  const survey = new Survey.Model(form.structure);
  const onCompleteExpression = survey.toJSON().onCompleteExpression;
  if (onCompleteExpression) {
    survey.onCompleting.add(() => {
      survey.runExpression(onCompleteExpression);
    });
  }
  survey.locale = lang;
  // fill with the record data
  survey.data = { ...record.data, ...newData };
  // validate the record
  survey.completeLastPage();
  if (survey.hasErrors()) {
    // get all the errors in a array of string format
    const questions = survey.getAllQuestions();
    const errors = questions
      .filter((q) => q.hasErrors())
      .map((q) => ({
        question: q.name,
        errors: q.getAllErrors().map((err) => err.getText()),
      }));
    return errors;
  }
  return [];
};
