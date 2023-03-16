import { Form, Record } from 'models';
import * as Survey from 'survey-knockout';
import config from 'config';

/**
 * Pass token before the request to fetch choices by URL if it's targeting SAFE API
 *
 * @param context GraphQL context.
 */
export const passTokenForChoicesByUrl = (context: any) => {
  Survey.ChoicesRestfull.onBeforeSendRequest = (
    sender: Survey.ChoicesRestful,
    options: { request: XMLHttpRequest }
  ) => {
    if (sender.url.includes(config.get('server.url'))) {
      const token = context.token;
      options.request.setRequestHeader('Authorization', token);
    }
  };
};

/**
 * Check if the record is correct according to the defined surveyjs validators
 *
 * @param record The record to check
 * @param newData The proposed update
 * @param form The formulaire object linked to the record
 * @param context GraphQL context
 * @param lang The current language of the form
 * @returns The list of errors (empty if no errors)
 */
export const checkRecordValidation = (
  record: Record,
  newData: any,
  form: Form,
  context,
  lang = 'en'
): { question: string; errors: string[] }[] => {
  // Necessary to fix 401 errors if we have choicesByUrl targeting self API.
  passTokenForChoicesByUrl(context);
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
        question: q.title || q.name,
        errors: q.getAllErrors().map((err) => err.getText()),
      }));
    return errors;
  }
  return [];
};
